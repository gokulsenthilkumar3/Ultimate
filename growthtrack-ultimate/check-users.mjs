import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });
const users = await prisma.user.findMany({ select: { id: true, email: true, fullName: true } });
console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
