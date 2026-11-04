import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { restoreEncryptedSQLiteBackup } from '../server/domains/scheduledBackups.js';

const root = fileURLToPath(new URL('../', import.meta.url));
config({ path: path.join(root, '.env'), quiet: true });
const [backup, destination, ...extra] = process.argv.slice(2);
if (!backup || !destination || extra.length) throw new Error('Usage: npm run backup:restore -- <archive.db.enc> <NEW-destination.db>');
await restoreEncryptedSQLiteBackup({ backup: path.resolve(backup), destination: path.resolve(destination), keyHex: process.env.APP_ENCRYPTION_KEY });
console.log('Encrypted database restored to a new file. Validate it before a coordinated recovery; the live database was not replaced.');
