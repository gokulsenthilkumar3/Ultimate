import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { localDatabaseFile } from '../server/domains/sqliteBackup.js';
import { rehearseNoteMigration } from '../server/domains/noteMigration.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(root, '.env'), quiet: true });
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/migrate-notes.mjs [--apply]');
const result = await rehearseNoteMigration({ source: localDatabaseFile(root), directory: process.env.BACKUP_DIR || path.join(root, 'backups'), apply: args.includes('--apply') });
console.log(`Notes migration ${result.applied ? 'applied' : 'rehearsed on a copy'}; verified backup, restore and parity: ${result.reportPath}`);
