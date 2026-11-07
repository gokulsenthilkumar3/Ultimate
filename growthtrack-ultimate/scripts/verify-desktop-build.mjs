import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { applicationRoot, uiSourceHash } from '../build/uiBuildInfo.js';
const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
const archive = path.resolve(process.argv[2] || '');
if (!archive.endsWith('app.asar') || !fs.existsSync(archive)) throw new Error('Pass the packaged resources/app.asar path.');
const files = asar.listPackage(archive).map(file => file.replaceAll('\\', '/').replace(/^\/+/, ''));
const forbidden = files.filter(file => !file.startsWith('node_modules/') && (/(^|\/)\.env(?:\.|$)/.test(file) || /(^|\/)(?:backups|uploads|vault|\.code-index)(?:\/|$)/.test(file) || /\.(?:db(?:-(?:wal|shm|journal))?|sqlite3?|mdf|ldf|ndf|trn|bak|pfx|p12)$/i.test(file)));
if (forbidden.length) throw new Error(`Private/generated files entered the package: ${forbidden.join(', ')}`);
let checked = 0;
for (const file of files.filter(file => file.startsWith('dist/') || file.startsWith('server/') || file.startsWith('prisma-generated/') || ['desktop.js', 'desktop-config.js', 'preload.cjs', 'server.js'].includes(file))) {
  const stat = asar.statFile(archive, path.normalize(file));
  if (stat.files) continue;
  if (!asar.extractFile(archive, path.normalize(file)).equals(fs.readFileSync(path.join(applicationRoot, file)))) throw new Error(`Packaged file differs: ${file}`);
  checked++;
}
if (checked < 100) throw new Error('Archive verification did not cover the UI assets.');
const info = JSON.parse(asar.extractFile(archive, path.normalize('dist/build-info.json')));
const connection = JSON.parse(asar.extractFile(archive, 'desktop-local-connection.json'));
if (connection.serverUrl !== null && connection.serverUrl !== 'http://127.0.0.1:3001/Ultimate/') throw new Error('Unexpected default server in the package.');
if (!files.includes('prisma-generated/client/default.js')) throw new Error('Portable SQLite client is missing.');
if (info.sourceHash !== uiSourceHash()) throw new Error('Packaged source fingerprint is stale.');
console.log(JSON.stringify({ status: 'verified', files: checked, version: info.version, sourceHash: info.sourceHash, archive }));
