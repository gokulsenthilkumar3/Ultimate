import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

export function validateOwnerSetup(input) {
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const fullName = typeof input?.fullName === 'string' ? input.fullName.trim() : '';
  const password = input?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !fullName || fullName.length > 200
    || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Enter a name, valid email, and a password of at least 12 characters and at most 72 UTF-8 bytes.');
  return { email, fullName, password };
}

export async function provisionLocalOwner(filename, input) {
  const values = validateOwnerSetup(input);
  const passwordHash = await bcrypt.hash(values.password, 12);
  const client = createClient({ url: `file:${filename.replaceAll('\\', '/')}` });
  let transaction;
  try {
    transaction = await client.transaction('write');
    const count = Number((await transaction.execute('SELECT count(*) AS count FROM "User"')).rows[0].count);
    if (count) throw new Error('Owner setup is unavailable because this database already has an account.');
    const id = randomUUID();
    const now = new Date().toISOString();
    await transaction.execute({ sql: 'INSERT INTO "User" (id, email, fullName, passwordHash, subscriptionTier, referralCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [id, values.email, values.fullName, passwordHash, 'owner', randomUUID(), now, now] });
    await transaction.commit();
    return { id, email: values.email };
  } finally { transaction?.close(); client.close(); }
}
