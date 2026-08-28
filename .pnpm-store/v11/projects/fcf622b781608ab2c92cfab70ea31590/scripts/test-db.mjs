import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
console.log('DB URL:', dbUrl);

const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

try {
  const hash = await bcrypt.hash('test12345', 10);
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      passwordHash: hash,
      fullName: 'Direct Test',
    },
  });
  console.log('OK', user.id);
} catch (e) {
  console.error('FAIL', e.message);
  if (e.meta) console.error('meta', e.meta);
} finally {
  await prisma.$disconnect();
}
