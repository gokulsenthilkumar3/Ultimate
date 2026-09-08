import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./dev.db');
const cols = db.prepare("PRAGMA table_info('Task')").all();
console.log('Task columns:', JSON.stringify(cols.map(c => c.name), null, 2));
db.close();
