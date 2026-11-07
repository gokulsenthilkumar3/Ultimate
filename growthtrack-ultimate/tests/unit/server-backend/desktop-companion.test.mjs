import test from 'node:test';
import assert from 'node:assert/strict';
import { trustedDesktopRequest, registerDesktopCompanion } from '../../../server/domains/desktopCompanion.js';
test('system status bridge rejects other windows, child frames and foreign origins', () => {
  const frame = { url: 'http://localhost:3001/Ultimate/' };
  const contents = { mainFrame: frame };
  const window = { isDestroyed: () => false, webContents: contents };
  assert.equal(trustedDesktopRequest({ sender: contents, senderFrame: frame }, window, 'http://localhost:3001'), true);
  assert.equal(trustedDesktopRequest({ sender: {}, senderFrame: frame }, window, 'http://localhost:3001'), false);
  assert.equal(trustedDesktopRequest({ sender: contents, senderFrame: { ...frame } }, window, 'http://localhost:3001'), false);
  assert.equal(trustedDesktopRequest({ sender: contents, senderFrame: frame }, window, 'https://untrusted.test'), false);
  assert.equal(trustedDesktopRequest({ sender: contents, senderFrame: frame }, null, 'http://localhost:3001'), false);
});
test('native pin uses an isolated fixed-origin window and rejects arbitrary feature navigation', async () => {
  const handlers = new Map(), windows = [];
  const frame = { url: 'http://localhost:3001/Ultimate/' };
  const main = { isDestroyed: () => false, webContents: { mainFrame: frame, getLastWebPreferences: () => ({ preload: 'preload.cjs' }) } };
  class Window {
    constructor(options) { this.options = options; this.webContents = { setWindowOpenHandler: fn => { this.open = fn; }, on: (event, fn) => { this.navigation = fn; } }; windows.push(this); }
    on() {} isDestroyed() { return false; } async loadURL(url) { this.url = url; } showInactive() { this.shown = true; }
  }
  registerDesktopCompanion({ ipcMain: { handle: (name, fn) => handlers.set(name, fn) }, app: {}, getWindow: () => main,
    getOrigin: () => 'http://localhost:3001', BrowserWindow: Window, preloadPath: 'explicit-preload.cjs',
    screen: { getCursorScreenPoint: () => ({ x: -200, y: 50 }), getDisplayNearestPoint: () => ({ workArea: { x: -800, y: 0, width: 800, height: 600 } }) },
    getCompanionUrl: () => 'http://localhost:3001/Ultimate/companion.html' });
  const request = { sender: main.webContents, senderFrame: frame };
  await handlers.get('growthtrack:open-companion')(request);
  assert.equal(windows.length, 1); const child = windows[0];
  assert.equal(child.url, 'http://localhost:3001/Ultimate/companion.html'); assert.equal(child.shown, true);
  assert.deepEqual(child.options.webPreferences, { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: 'explicit-preload.cjs' });
  assert.equal(child.options.height, 600); assert.ok(child.options.x >= -800); assert.equal(child.options.alwaysOnTop, true);
  assert.deepEqual(child.open(), { action: 'deny' }); let prevented = false;
  child.navigation({ preventDefault: () => { prevented = true; } }, 'https://untrusted.test/'); assert.equal(prevented, true);
  assert.throws(() => handlers.get('growthtrack:open-feature')(request, '../../private'), /Invalid desktop navigation/);
  await assert.rejects(handlers.get('growthtrack:open-companion')({ ...request, sender: {} }), /Open the companion/);
});
