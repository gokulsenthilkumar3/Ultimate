import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientFile = path.join(root, 'node_modules', '.prisma', 'client', 'index.js');
const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');

const res = spawnSync(process.execPath, [prismaCli, 'generate', '--schema', 'prisma/schema.prisma'], { cwd: root, stdio: 'inherit' });
if (res.status !== 0) process.exit(res.status || 1);
if (!fs.existsSync(clientFile)) throw new Error('Generated SQLite client is missing.');
if (fs.existsSync(path.join(root, 'prisma/schema.sqlserver.prisma'))) {
  const sqlServer = spawnSync(process.execPath, [prismaCli, 'generate', '--schema', 'prisma/schema.sqlserver-client.prisma'], { cwd: root, stdio: 'inherit' });
  if (sqlServer.status !== 0) process.exit(sqlServer.status || 1);
}
