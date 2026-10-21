import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const applicationDirectory = path.resolve(scriptDirectory, '..');
require('dotenv').config({ path: path.join(applicationDirectory, '.env') });
const { PrismaClient } = require('@prisma/client');

const configuredDatabaseUrl = process.env.DATABASE_URL;
const databaseUrl = configuredDatabaseUrl?.startsWith('file:./')
  ? `file:${path.resolve(applicationDirectory, configuredDatabaseUrl.slice('file:'.length)).replaceAll('\\', '/')}`
  : configuredDatabaseUrl || `file:${path.join(applicationDirectory, 'dev.db').replaceAll('\\', '/')}`;
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl }) });

const email = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
const password = String(process.env.OWNER_PASSWORD || '');
const fullName = String(process.env.OWNER_NAME || '').trim();

try {
  if (!email || !fullName || password.length < 12) {
    throw new Error('Set OWNER_EMAIL, OWNER_NAME, and an OWNER_PASSWORD of at least 12 characters in .env.');
  }
  const count = await prisma.user.count();
  if (count > 0) throw new Error('Owner creation refused because a user already exists.');
  const owner = await prisma.user.create({
    data: { email, fullName, passwordHash: await bcrypt.hash(password, 12), subscriptionTier: 'owner' },
    select: { id: true, email: true, fullName: true },
  });
  await prisma.userPreference.create({ data: { userId: owner.id } });
  console.log(`Owner created for ${owner.email}. Remove OWNER_PASSWORD from .env now.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
