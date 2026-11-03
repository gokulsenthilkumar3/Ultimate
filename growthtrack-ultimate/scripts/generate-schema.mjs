import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check') || args.length > 1) throw new Error('Usage: node scripts/generate-schema.mjs [--check]');

// Prisma's DDL excludes custom triggers. Both release paths must append the
// reviewed integrity contract before a new installation uses this bootstrap.
const ddl = execFileSync(process.execPath, [
  'node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty',
  '--to-schema', 'prisma/schema.prisma', '--script',
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const schema = `${ddl.trimEnd()}\n\n${fs.readFileSync(path.join(root, 'prisma/integrity.sql'), 'utf8')}`;
const target = path.join(root, 'prisma/fresh-schema.sql');
if (args.includes('--check')) {
  if (fs.readFileSync(target, 'utf8').replaceAll('\r\n', '\n') !== schema.replaceAll('\r\n', '\n')) {
    throw new Error('Fresh schema drift: run node scripts/generate-schema.mjs.');
  }
  console.log('Fresh schema matches Prisma and reviewed integrity triggers.');
} else {
  fs.writeFileSync(target, schema);
}
