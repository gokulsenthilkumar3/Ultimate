import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = process.env.DATABASE_FILE || path.join(root, 'dev.db');
const destinationDir = process.env.BACKUP_DIR || path.join(root, 'backups');
fs.mkdirSync(destinationDir, { recursive: true });
const destination = path.join(destinationDir, `growthtrack-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}.db`);
fs.copyFileSync(source, destination);
console.log(`Database backup created: ${destination}`);
