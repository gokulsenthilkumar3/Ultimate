import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeDatabase } from '../server/domains/databaseInitialization.js';
import { localDatabaseFile } from '../server/domains/sqliteBackup.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv.length > 2) throw new Error('The init command accepts no arguments.');
const schema = await fs.readFile(path.join(root, 'prisma/fresh-schema.sql'), 'utf8');
await initializeDatabase({ filename: localDatabaseFile(root), schema });
console.log('New database initialized and integrity checked. Create the owner account before signing in.');
