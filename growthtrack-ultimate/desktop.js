import { app, BrowserWindow, shell, ipcMain, safeStorage } from 'electron';
import { dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { sharedServerUrl } from './desktop-config.js';
import { inspectDesktopDatabase } from './server/domains/desktopDatabase.js';
import { initializeDatabase } from './server/domains/databaseInitialization.js';
import { rehearseNoteMigration } from './server/domains/noteMigration.js';
import { provisionLocalOwner } from './server/domains/ownerProvisioning.js';
let mainWindow;
let stopLocalServer;
let quitting = false;
let localServerClosing = false;
if (process.env.GROWTHTRACK_USER_DATA) {
  const customData = path.resolve(process.env.GROWTHTRACK_USER_DATA);
  fs.mkdirSync(customData, { recursive: true });
  app.setPath('userData', customData);
}
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });

// GPU fallback is opt-in so the default desktop path can use WebGL. Machines
// with unstable drivers can set GROWTH_TRACK_DISABLE_GPU=true.
if (process.env.GROWTH_TRACK_DISABLE_GPU === 'true') app.disableHardwareAcceleration();

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

async function prepareUserDatabase(userDatabase) {
  const appRoot = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(path.dirname(userDatabase), { recursive: true });
  const status = await inspectDesktopDatabase(userDatabase);
  if (status.phase === 'new') {
    const answer = dialog.showMessageBoxSync(mainWindow, { type: 'question', title: 'Set up GrowthTrack', message: 'Initialize a new private database?', detail: 'Create your account next. Existing accounts or development data are not copied.', buttons: ['Initialize', 'Cancel'], cancelId: 1 });
    if (answer !== 0) throw new Error('Database initialization was canceled.');
    const schema = await fs.promises.readFile(path.join(appRoot, 'prisma', 'fresh-schema.sql'), 'utf8');
    await initializeDatabase({ filename: userDatabase, schema });
    process.env.GROWTHTRACK_NOTES_V1 = '1';
  } else if (status.phase === 'notes-upgrade') {
    const directory = path.join(path.dirname(userDatabase), 'backups');
    const rehearsal = await rehearseNoteMigration({ source: userDatabase, directory });
    const answer = dialog.showMessageBoxSync(mainWindow, { type: 'question', title: 'Notes upgrade ready', message: 'Enable Notes revision history and synchronization?', detail: `A backup, fresh restore and original-data parity check passed. Close other processes writing this database. Private plaintext recovery copies are retained in ${directory}.`, buttons: ['Apply verified upgrade', 'Keep legacy Notes'], defaultId: 1, cancelId: 1 });
    if (answer === 0) {
      if (!rehearsal.reportPath) throw new Error('The migration rehearsal was not acknowledged.');
      await rehearseNoteMigration({ source: userDatabase, directory, apply: true });
      process.env.GROWTHTRACK_NOTES_V1 = '1';
    } else process.env.GROWTHTRACK_NOTES_V1 = '0';
  } else process.env.GROWTHTRACK_NOTES_V1 = '1';
  return status;
}

function prepareVaultKey(userDataDir) {
  if (process.env.APP_ENCRYPTION_KEY) return;
  if (!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend?.() === 'basic_text') throw new Error('Secure operating-system key storage is unavailable. Configure a private HTTPS server or restore protected desktop key storage.');
  const filename = path.join(userDataDir, 'vault-key.bin');
  if (fs.existsSync(filename)) process.env.APP_ENCRYPTION_KEY = safeStorage.decryptString(fs.readFileSync(filename));
  else {
    const key = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(filename, safeStorage.encryptString(key), { flag: 'wx', mode: 0o600 });
    process.env.APP_ENCRYPTION_KEY = key;
  }
}

async function setupOwner(userDatabase) {
  const setupFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'desktop-setup.html');
  const allowedUrl = pathToFileURL(setupFile).href;
  let busy = false;
  await new Promise((resolve, reject) => {
    ipcMain.handle('growthtrack:provision-owner', async (event, input) => {
      if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || event.senderFrame.url !== allowedUrl) return { success: false, error: 'Account setup is unavailable from this page.' };
      if (busy) return { success: false, error: 'Account setup is already running.' };
      busy = true;
      try { await provisionLocalOwner(userDatabase, input); resolve(); return { success: true }; }
      catch (error) { return { success: false, error: error.message || 'Account setup failed.' }; }
      finally { busy = false; }
    });
    mainWindow.once('closed', () => reject(new Error('Account setup was canceled.')));
    void mainWindow.loadFile(setupFile).catch(reject);
  }).finally(() => ipcMain.removeHandler('growthtrack:provision-owner'));
}

async function createWindow() {
  const shared = sharedServerUrl(process.env.GROWTHTRACK_SERVER_URL);
  const userDataDir = app.getPath('userData');
  const userDatabase = path.join(userDataDir, 'growthtrack.db');
  fs.mkdirSync(userDataDir, { recursive: true });
  // Create the window before loading the server so startup failures are visible.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.cjs'),
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = shared || new URL(`http://localhost:${process.env.PORT || 3001}`);
    try { if (new URL(url).origin !== allowed.origin) event.preventDefault(); }
    catch { event.preventDefault(); }
  });
  if (shared) {
    // Shared mode never opens, copies, merges, or migrates a local database.
    await mainWindow.loadURL(shared.href);
    mainWindow.on('closed', () => { mainWindow = null; });
    return;
  }
  const databaseStatus = await prepareUserDatabase(userDatabase);
  // The repository .env may enable record rows for the web database; the
  // desktop database decides for itself, from the tables it actually has.
  process.env.GROWTHTRACK_RECORD_ROWS = (await inspectDesktopDatabase(userDatabase)).recordRows ? '1' : '0';
  prepareVaultKey(userDataDir);
  if (databaseStatus.ownerRequired) await setupOwner(userDatabase);
  process.env.DATABASE_URL = `file:${userDatabase.replaceAll('\\', '/')}`;
  process.env.FILE_STORAGE_ROOT = path.join(userDataDir, 'private-files');
  process.env.LOG_DIR = path.join(userDataDir, 'logs');
  process.env.BACKUP_DIR = path.join(userDataDir, 'backups');
  process.env.LISTEN_HOST = '127.0.0.1';
  process.env.NODE_ENV = 'desktop';
  process.env.APP_URL = `http://localhost:${process.env.PORT || 3001}/Ultimate/`;
  process.env.APP_ORIGINS = `http://localhost:${process.env.PORT || 3001}`;

  // Tell the Express server to serve the frontend dist folder in desktop mode
  process.env.SERVE_FRONTEND = 'true';
  try {
    const { server, closeServer } = await import('./server.js');
    stopLocalServer = closeServer;
    if (!server.listening) await new Promise((resolve, reject) => {
      server.once('listening', resolve); server.once('error', reject);
    });
  } catch (error) { showStartupFailure(error); return; }

  // Load the web app running on the express server
  const PORT = process.env.PORT || 3001;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { await fetch(`http://localhost:${PORT}/api/health`); break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  const frontendBase = process.env.FRONTEND_BASE_PATH || '/Ultimate/';
  try { await mainWindow.loadURL(new URL(frontendBase, `http://localhost:${PORT}/`).href); } catch (error) { showStartupFailure(error); }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

process.on('uncaughtException', (error) => showStartupFailure(error));
process.on('unhandledRejection', (error) => showStartupFailure(error));

if (singleInstance) app.on('ready', () => { void createWindow(); });

app.on('before-quit', event => {
  if (!stopLocalServer || quitting) return;
  event.preventDefault();
  if (localServerClosing) return;
  localServerClosing = true;
  // Let an encrypted archive finish and its temporary plaintext checks close.
  // Shared-server mode has no local server or local backup to stop.
  void stopLocalServer().catch(error => console.error('Local server shutdown failed:', error?.code || 'SHUTDOWN_FAILED')).finally(() => { quitting = true; app.quit(); });
});

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
