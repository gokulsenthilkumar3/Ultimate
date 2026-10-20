import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createSQLiteBackup, localDatabaseFile } from '../server/domains/sqliteBackup.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
config({ path: path.join(root, '.env'), quiet: true });
const source = localDatabaseFile(root);
const destinationDir = process.env.BACKUP_DIR || path.join(root, 'backups');
const result = await createSQLiteBackup({ source, directory: destinationDir });
console.log(`Database backup and restore check verified: ${result.manifestPath}`);
