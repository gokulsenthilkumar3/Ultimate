/* global process */
import { app, BrowserWindow } from 'electron';
import { dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
let mainWindow;

// Some Windows drivers crash Electron's GPU process before Chromium can show
// a window. The web renderer still keeps its own WebGL quality/fallback logic.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
// Keep Chromium's GPU implementation in the browser process. On some
// Windows installations the sandboxed GPU child process exits with a native
// breakpoint before Electron can create the first window.
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');

// Electron otherwise places its cache beside the installed executable. That
// location can be read-only for per-user installs, which causes repeated GPU
// startup failures. Use the writable per-user data directory instead.
try {
  const writableCache = path.join(app.getPath('userData'), 'Cache');
  fs.mkdirSync(writableCache, { recursive: true });
  app.setPath('cache', writableCache);
  app.commandLine.appendSwitch('disk-cache-dir', writableCache);
} catch {
  // Electron will fall back to its default cache path if this is unavailable.
}

function showStartupFailure(error) {
  const message = String(error?.stack || error?.message || error || 'Unknown startup error')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const html = `<!doctype html><meta charset="utf-8"><title>GrowthTrack could not start</title><style>body{font:16px system-ui;background:#10141d;color:#eef2ff;padding:48px;max-width:760px;margin:auto}code{display:block;white-space:pre-wrap;background:#1d2636;padding:16px;border-radius:10px;color:#ffb4ab}</style><h1>GrowthTrack could not start</h1><p>Close any previous GrowthTrack window and try again. If this continues, share the diagnostic details below.</p><code>${message}</code>`;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function prepareUserDatabase(userDatabase) {
  const appRoot = path.dirname(fileURLToPath(import.meta.url));
  const bundledDatabase = path.join(process.resourcesPath, 'app', 'dev.db');
  const localDatabase = path.join(appRoot, 'dev.db');
  fs.mkdirSync(path.dirname(userDatabase), { recursive: true });
  if (!fs.existsSync(userDatabase)) {
    const source = fs.existsSync(bundledDatabase) ? bundledDatabase : localDatabase;
    if (fs.existsSync(source)) fs.copyFileSync(source, userDatabase);
  }
  if (!fs.existsSync(userDatabase)) return;

  const prismaCli = path.join(appRoot, 'node_modules', 'prisma', 'build', 'index.js');
  const schema = path.join(appRoot, 'prisma', 'schema.prisma');
  if (!fs.existsSync(prismaCli) || !fs.existsSync(schema)) return;
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', DATABASE_URL: `file:${userDatabase.replaceAll('\\', '/')}` };
  const status = spawnSync(process.execPath, [prismaCli, 'migrate', 'status', '--schema', schema], { cwd: appRoot, env, encoding: 'utf8', windowsHide: true });
  const statusText = `${status.stdout || ''}\n${status.stderr || ''}`;
  const needsUpdate = /not yet applied|have not been applied|database schema is not up to date/i.test(statusText);
  if (!needsUpdate) return;

  const answer = dialog.showMessageBoxSync({
    parent: mainWindow,
    type: 'question', title: 'GrowthTrack database update',
    message: 'A newer app version has a database update available.',
    detail: 'GrowthTrack will create a backup before updating your existing data. Continue with the safe update?',
    buttons: ['Update safely', 'Skip for now'], defaultId: 0, cancelId: 1,
  });
  if (answer !== 0) return;
  fs.copyFileSync(userDatabase, `${userDatabase}.backup-${Date.now()}`);
  const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', schema], { cwd: appRoot, env, encoding: 'utf8', windowsHide: true });
  if (migration.status !== 0) throw new Error(`Database update failed. Your backup is safe.\n${migration.stderr || migration.stdout || 'Unknown migration error.'}`);
}

async function createWindow() {
  const userDataDir = app.getPath('userData');
  const userDatabase = path.join(userDataDir, 'growthtrack.db');
  fs.mkdirSync(userDataDir, { recursive: true });
  // Create the window before loading the server so startup failures are visible.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  prepareUserDatabase(userDatabase);
  process.env.DATABASE_URL = `file:${userDatabase.replaceAll('\\', '/')}`;

  // Tell the Express server to serve the frontend dist folder in desktop mode
  process.env.SERVE_FRONTEND = 'true';
  try { await import('./server.js'); } catch (error) { showStartupFailure(error); return; }

  // Load the web app running on the express server
  const PORT = process.env.PORT || 3001;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { await fetch(`http://localhost:${PORT}/api/health`); break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  try { await mainWindow.loadURL(`http://localhost:${PORT}/`); } catch (error) { showStartupFailure(error); }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

process.on('uncaughtException', (error) => showStartupFailure(error));
process.on('unhandledRejection', (error) => showStartupFailure(error));

app.on('ready', () => { void createWindow(); });

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
