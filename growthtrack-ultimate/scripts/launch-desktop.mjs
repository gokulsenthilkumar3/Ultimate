import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { uiSourceHash, applicationRoot } from '../build/uiBuildInfo.js';
const root = applicationRoot;
const development = process.argv.includes('--dev');
if (!development) {
  let current;
  try { current = JSON.parse(fs.readFileSync(path.join(root, 'dist/build-info.json'), 'utf8')); } catch { /* A fresh build is required. */ }
  if (current?.sourceHash !== uiSourceHash(root)) {
    console.log('Desktop UI is missing or stale; rebuilding from current source.');
    execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: root, stdio: 'inherit', windowsHide: true });
  }
}
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
if (development) { env.GROWTHTRACK_ALLOW_LOOPBACK_SERVER = 'true'; env.GROWTHTRACK_SERVER_URL ||= 'http://127.0.0.1:5000/Ultimate/'; }
const child = spawn(path.join(root, 'node_modules/electron/dist/electron.exe'), ['.'], { cwd: root, env, stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
