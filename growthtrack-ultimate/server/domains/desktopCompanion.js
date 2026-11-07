import os from 'node:os';
import { statfs } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const cpuTimes = () => os.cpus().reduce((sum, cpu) => ({ idle: sum.idle + cpu.times.idle, total: sum.total + Object.values(cpu.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
export function trustedDesktopRequest(event, window, origin) {
  if (!window || window.isDestroyed() || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return false;
  try { return new URL(event.senderFrame.url).origin === origin; } catch { return false; }
}
export function registerDesktopCompanion({ ipcMain, app, getWindow, getOrigin, BrowserWindow, screen, getCompanionUrl, preloadPath }) {
  let pending = null;
  let companion = null;
  const allowed = event => trustedDesktopRequest(event, getWindow(), getOrigin()) || trustedDesktopRequest(event, companion, getOrigin());
  ipcMain.handle('growthtrack:system-summary', async event => {
    if (!allowed(event)) throw new Error('Desktop status is available only to the trusted Ultimate windows.');
    if (!pending) pending = (async () => {
      const first = cpuTimes();
      await delay(200);
      const second = cpuTimes(), elapsed = second.total - first.total;
      const disk = await statfs(app.getPath('userData'));
      return { cpuPercent: elapsed > 0 ? Math.max(0, Math.min(100, 100 * (1 - (second.idle - first.idle) / elapsed))) : 0,
        totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem(), diskTotalBytes: disk.blocks * disk.bsize, diskFreeBytes: disk.bavail * disk.bsize };
    })().finally(() => { pending = null; });
    return pending;
  });
  ipcMain.handle('growthtrack:open-companion', async event => {
    if (!trustedDesktopRequest(event, getWindow(), getOrigin())) throw new Error('Open the companion from Ultimate.');
    if (companion && !companion.isDestroyed()) { companion.show(); return { opened: true }; }
    const url = new URL(getCompanionUrl());
    if (url.origin !== getOrigin() || !url.pathname.endsWith('/companion.html')) throw new Error('Invalid companion entry point.');
    const work = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    companion = new BrowserWindow({ width: Math.min(380, work.width), height: Math.min(680, work.height), x: Math.max(work.x, work.x + work.width - 400), y: Math.max(work.y, work.y + work.height - 700),
      frame: false, transparent: true, resizable: false, alwaysOnTop: true, skipTaskbar: true, show: false, parent: getWindow(),
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: preloadPath || getWindow().webContents.getLastWebPreferences().preload } });
    const created = companion;
    created.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    created.webContents.on('will-navigate', (navigation, target) => { if (target !== url.href) navigation.preventDefault(); });
    created.on('closed', () => { if (companion === created) companion = null; });
    try { await created.loadURL(url.href); if (!created.isDestroyed()) created.showInactive(); }
    catch (error) { if (!created.isDestroyed()) created.close(); throw error; }
    return { opened: true };
  });
  ipcMain.handle('growthtrack:close-companion', event => {
    if (!trustedDesktopRequest(event, companion, getOrigin())) throw new Error('Not a companion window.');
    companion.close(); return { closed: true };
  });
  ipcMain.handle('growthtrack:open-feature', (event, feature) => {
    if (!allowed(event) || !['notes', 'calendar', 'current', 'ai'].includes(feature)) throw new Error('Invalid desktop navigation.');
    const main = getWindow(); if (!main || main.isDestroyed()) throw new Error('Ultimate is not open.');
    if (main.isMinimized()) main.restore(); main.show(); main.focus(); main.webContents.send('growthtrack:open-feature', feature);
    return { opened: true };
  });
}
