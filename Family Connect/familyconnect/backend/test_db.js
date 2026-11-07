// Connectivity check using the configured identity. Never guess passwords or
// log credentials/driver errors that may contain connection URLs.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
async function test() {
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL before checking connectivity.');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection verified.');
  } catch {
    console.error('Database connection failed. Check the local configuration.');
    process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}
test().catch(() => { console.error('Database connectivity check could not start.'); process.exitCode = 1; });
