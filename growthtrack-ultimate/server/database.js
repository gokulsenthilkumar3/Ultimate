import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { PrismaLibSql } from '@prisma/adapter-libsql';
const require = createRequire(import.meta.url);
export function databaseProvider(env = process.env) {
  const provider = env.DATABASE_PROVIDER || (env.DATABASE_URL?.startsWith('sqlserver:') ? 'sqlserver' : 'sqlite');
  if (!['sqlite', 'sqlserver'].includes(provider)) throw new Error('DATABASE_PROVIDER must be sqlite or sqlserver.');
  if (provider === 'sqlserver' && !env.DATABASE_URL?.startsWith('sqlserver://')) throw new Error('SQL Server requires DATABASE_URL=sqlserver://... in the private server environment.');
  if (provider === 'sqlite' && env.DATABASE_URL?.startsWith('sqlserver:')) throw new Error('Database provider and URL disagree.');
  return provider;
}
export async function createDatabaseClient(root, env = process.env) {
  const provider = databaseProvider(env);
  if (provider === 'sqlserver') {
    if (env.BACKUP_ENABLED === 'true') throw new Error('SQLite BACKUP_ENABLED cannot protect SQL Server. Configure SQL Server backup jobs first.');
    const { PrismaMssql } = await import('@prisma/adapter-mssql');
    const { PrismaClient } = require(path.join(root, 'prisma-generated/sqlserver'));
    const prisma = new PrismaClient({ adapter: new PrismaMssql(env.DATABASE_URL) });
    Object.defineProperty(prisma, '$growthtrackProvider', { value: provider });
    return { provider, databaseUrl: env.DATABASE_URL, prisma };
  }
  const databaseUrl = env.DATABASE_URL?.startsWith('file:./') ? `file:${path.resolve(root, env.DATABASE_URL.slice(5)).replaceAll('\\', '/')}` : env.DATABASE_URL || `file:${path.join(root, 'dev.db').replaceAll('\\', '/')}`;
  // electron-builder omits the hidden node_modules/.prisma directory. Release
  // builds explicitly copy the generated client to a normal packaged folder.
  const workspaceClient = path.join(root, 'node_modules/.prisma/client/default.js');
  const { PrismaClient } = fs.existsSync(workspaceClient)
    ? require(require.resolve('@prisma/client', { paths: [root] }))
    : require(path.join(root, 'prisma-generated/client'));
  return { provider, databaseUrl, prisma: new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl }) }) };
}
