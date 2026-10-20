import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@libsql/client';

// Only a new filename can be initialized. No db push, schema reset, or upgrade
// is performed against an existing installation.
export async function initializeDatabase({ filename, schema }) {
  const target = path.resolve(filename);
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const handle = await fs.open(target, 'wx', 0o600);
  await handle.close();
  const client = createClient({ url: `file:${target.replaceAll('\\', '/')}` });
  try {
    await client.executeMultiple(schema);
    const integrity = await client.execute('PRAGMA integrity_check');
    if (integrity.rows[0]?.integrity_check !== 'ok') throw new Error('New database integrity verification failed.');
    const foreignKeys = await client.execute('PRAGMA foreign_key_check');
    if (foreignKeys.rows.length) throw new Error('New database contains invalid foreign keys.');
    return target;
  } finally { client.close(); }
}
