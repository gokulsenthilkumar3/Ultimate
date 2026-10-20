import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { localDatabaseFile } from '../server/domains/sqliteBackup.js';
import { rehearseRecordMigration } from '../server/domains/recordMigration.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(root, '.env'), quiet: true });
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/migrate-records.mjs [--apply]');
const result = await rehearseRecordMigration({ source: localDatabaseFile(root), directory: process.env.BACKUP_DIR || path.join(root, 'backups'), apply: args.includes('--apply') });
console.log(`Calendar/portfolio row migration ${result.applied ? 'applied' : 'rehearsed on a copy'} (${result.proof.events} events, ${result.proof.holdings} holdings across ${result.proof.owners} owners); verified backup and parity: ${result.reportPath}`);
if (result.applied) console.log('Set GROWTHTRACK_RECORD_ROWS=1 and restart the server to use row storage.');
