import { spawn } from 'node:child_process';
// Frontend-only. The browser fixture intercepts every API call; no owner database or server is opened.
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5176', '--strictPort'], {
  env: { ...process.env, VITE_BASE_PATH: '/', VITE_PORT: '5176' }, stdio: 'inherit', windowsHide: true,
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code || 0));
