const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

async function run() {
  const dbPath = path.resolve(__dirname, 'tracker.db');
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const prisma = new PrismaClient({ adapter });

  try {
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    const auditCount = await prisma.auditLog.count();
    const sessionCount = await prisma.sessionLog.count();
    const loginCount = await prisma.loginLog.count();

    console.log('--- DATABASE STATUS ---');
    console.log('User count:', userCount);
    console.log('Users:', users);
    console.log('Audit logs count:', auditCount);
    console.log('Session logs count:', sessionCount);
    console.log('Login logs count:', loginCount);
  } catch (err) {
    console.error('Error checking database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
