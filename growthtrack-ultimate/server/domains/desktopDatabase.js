import fs from 'node:fs/promises';
import { createClient } from '@libsql/client';

export async function inspectDesktopDatabase(filename) {
  const stat = await fs.stat(filename).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (!stat) return { phase: 'new', ownerRequired: true };
  if (!stat.isFile() || !stat.size) throw new Error('Existing desktop storage is empty or invalid. It was preserved; use a reviewed import or restore.');
  const client = createClient({ url: `file:${filename.replaceAll('\\', '/')}` });
  try {
    const columns = (await client.execute('PRAGMA table_info("Note")')).rows.map(row => row.name);
    if (!['id', 'userId', 'title', 'content', 'data', 'updatedAt'].every(name => columns.includes(name))) throw new Error('Desktop storage is not a recognized Ultimate database. It was preserved; use a reviewed import.');
    const additions = ['revision', 'kind', 'pinned', 'starred', 'deletedAt'];
    const upgraded = additions.every(name => columns.includes(name));
    if (!upgraded && additions.some(name => columns.includes(name))) throw new Error('Desktop storage has a partial Notes upgrade. Restore or reconcile it before continuing.');
    if (upgraded) {
      for (const name of ['NoteRevision', 'NoteMutation', 'NoteChange']) {
        if (!(await client.execute({ sql: 'SELECT name FROM sqlite_master WHERE type = ? AND name = ?', args: ['table', name] })).rows.length) throw new Error('Desktop Notes history tables are incomplete. Storage was preserved.');
      }
    }
    const count = Number((await client.execute('SELECT count(*) AS count FROM "User"')).rows[0].count);
    // Calendar/holding rows are used only once all four record tables exist.
    const recordTables = (await client.execute("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('calendar_events','portfolio_holdings','record_mutations','record_changes')")).rows[0].count;
    return { phase: upgraded ? 'ready' : 'notes-upgrade', ownerRequired: count === 0, recordRows: Number(recordTables) === 4 };
  } finally { client.close(); }
}
