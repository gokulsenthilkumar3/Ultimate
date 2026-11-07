import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'growthtrack-ultimate');
export function sqlServerSchema(input) {
  return input.replace('provider = "sqlite"', 'provider = "sqlserver"')
    .replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "../prisma-generated/sqlserver"')
    .replace(/model (\w+) \{([\s\S]*?)^\}/gm, (_, name, body) => {
      const indexed = new Set([...body.matchAll(/@@(?:index|unique|id)\(\[([^\]]+)\]/g)].flatMap(m => m[1].split(',').map(x => x.trim().split('(')[0])));
      return `model ${name} {${body.split('\n').map(line => {
        const field = line.match(/^\s+(\w+)\s+String\??(?:\s|$)/);
        if (field && !line.includes('@db.')) {
          const bounded = indexed.has(field[1]) || /@id\b|@unique\b/.test(line) || /^(id|.*Id)$/.test(field[1]);
          const parts = line.split('//'); line = parts[0].trimEnd() + (bounded ? ' @db.NVarChar(200)' : ' @db.NVarChar(Max)') + (parts.length > 1 ? ' //' + parts.slice(1).join('//') : '');
        }
        if (/^\s+(amountMinor|limitMinor|costMinor)\s+Int\?/.test(line)) line = line.replace('Int?', 'BigInt?');
        if (line.includes('@relation(')) line = line.replace(/@relation\((.*?)\)/, (_, args) => !args.includes('fields:') ? `@relation(${args})` : `@relation(${args.replace(/,?\s*onDelete:\s*\w+/g, '').replace(/,?\s*onUpdate:\s*\w+/g, '')}, onDelete: NoAction, onUpdate: NoAction)`);
        return line;
      }).join('\n')}\n}`;
    });
}
export function bootstrap(ddl, hash) {
  const count = [...ddl.matchAll(/CREATE TABLE /g)].length;
  if (!count) throw new Error('Empty generated schema.');
  const triggers = [['Transaction', 'amount', 'amountMinor'], ['Budget', 'limit_amount', 'limitMinor'], ['SubscriptionItem', 'cost', 'costMinor']].map(([table, amount, minor]) => {
    const trigger = `CREATE OR ALTER TRIGGER dbo.[${table}_money_integrity] ON dbo.[${table}] AFTER INSERT, UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF TRIGGER_NESTLEVEL() > 1 RETURN;
 IF EXISTS (SELECT 1 FROM inserted WHERE [${amount}] IS NOT NULL AND (ABS([${amount}]) > 1000000000000 OR [${amount}] <> ROUND([${amount}],2)))
 BEGIN THROW 51001, 'Money requires at most two decimal places within supported range', 1; END;
 UPDATE target SET [${minor}]=CONVERT(BIGINT,ROUND(source.[${amount}]*100,0)) FROM dbo.[${table}] target JOIN inserted source ON target.id=source.id;
END`;
    return `EXEC(N'${trigger.replaceAll("'", "''")}');`;
  });
  for (const [table, query] of [['GoalProgressLog', 'SELECT 1 FROM inserted i LEFT JOIN dbo.Goal g ON g.id=i.goalId AND g.userId=i.userId WHERE g.id IS NULL'], ['Goal', 'SELECT 1 FROM inserted i JOIN dbo.GoalProgressLog p ON p.goalId=i.id WHERE p.userId<>i.userId']]) {
    triggers.push(`EXEC(N'CREATE OR ALTER TRIGGER dbo.[${table}_owner_integrity] ON dbo.[${table}] AFTER INSERT, UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS (${query}) BEGIN THROW 51002, ''Goal owner mismatch'', 1; END; END');`);
  }
  return `-- GrowthTrack local SSMS / SQL Server 2017+ bootstrap: ${count} application tables.
-- No DROP/TRUNCATE or replacement of existing tables. Repeat runs verify the model hash.
-- SSMS users execute this T-SQL; no Prisma CLI required. It does not copy SQLite data.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_ID(N'GrowthTrackDB') IS NULL EXEC(N'CREATE DATABASE [GrowthTrackDB]');
GO
USE [GrowthTrackDB];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF OBJECT_ID(N'dbo.__GrowthTrackSchema',N'U') IS NOT NULL
BEGIN
 IF NOT EXISTS (SELECT 1 FROM dbo.__GrowthTrackSchema WHERE id=1 AND modelHash=N'${hash}')
 BEGIN THROW 51000, 'Schema differs; apply a reviewed migration. No bootstrap changes applied.', 1; END;
 PRINT 'Matching schema already exists; no changes applied.';
END
ELSE
BEGIN
 IF EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped=0)
 BEGIN THROW 51000, 'Existing tables have no matching bootstrap marker. No changes applied.', 1; END;
 BEGIN TRY
 BEGIN TRANSACTION;
 ${ddl.trim()}
 ${triggers.join('\n')}
 CREATE TABLE dbo.__GrowthTrackSchema(id INT NOT NULL PRIMARY KEY,modelHash NVARCHAR(64) NOT NULL,appliedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
 INSERT INTO dbo.__GrowthTrackSchema(id,modelHash) VALUES(1,N'${hash}');
 COMMIT TRANSACTION;
 PRINT 'Schema created; no personal accounts or secrets seeded.';
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
 THROW;
 END CATCH;
END;
GO
`;
}
export function generate() {
  const original = fs.readFileSync(path.join(app, 'prisma/schema.prisma'), 'utf8');
  const schema = sqlServerSchema(original);
  fs.writeFileSync(path.join(app, 'prisma/schema.sqlserver.prisma'), schema);
  // Database FKs use NO ACTION to avoid SQL Server's multiple cascade paths.
  // The application client retains the original delete behavior via emulation.
  let clientSchema = schema.replace('provider = "sqlserver"', 'provider = "sqlserver"\n  relationMode = "prisma"');
  const relations = new Map();
  for (const match of original.matchAll(/model (\w+) \{([\s\S]*?)^\}/gm)) for (const line of match[2].split('\n')) {
    if (line.includes('@relation(') && line.includes('fields:')) relations.set(`${match[1]}.${line.trim().split(/\s/)[0]}`, line.match(/onDelete:\s*(\w+)/)?.[1] || 'NoAction');
  }
  clientSchema = clientSchema.replace(/model (\w+) \{([\s\S]*?)^\}/gm, (_, name, body) => `model ${name} {${body.split('\n').map(line => {
    const action = relations.get(`${name}.${line.trim().split(/\s/)[0]}`);
    return action ? line.replace('onDelete: NoAction', `onDelete: ${action}`) : line;
  }).join('\n')}\n}`);
  fs.writeFileSync(path.join(app, 'prisma/schema.sqlserver-client.prisma'), clientSchema);
  const ddl = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.sqlserver.prisma', '--script'], { cwd: app, encoding: 'utf8', env: { ...process.env, DATABASE_URL: 'sqlserver://localhost:1433;database=GrowthTrackDB;encrypt=true;' }, stdio: ['ignore', 'pipe', 'inherit'] });
  const sql = bootstrap(ddl, createHash('sha256').update(schema).digest('hex'));
  for (const file of ['docs/GrowthTrack_MSSQL_SSMS.sql', 'growthtrack-ultimate/prisma/GrowthTrack_MSSQL_SSMS.sql']) fs.writeFileSync(path.join(root, file), sql);
  console.log(`Generated ${[...ddl.matchAll(/CREATE TABLE /g)].length} SQL Server tables. No database changed.`);
}
