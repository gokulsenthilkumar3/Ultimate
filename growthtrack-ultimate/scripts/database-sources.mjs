import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { createDatabaseClient } from '../server/database.js';

const appRoot = path.resolve(import.meta.dirname, '..');
const workspaceRoot = path.dirname(appRoot);
const require = createRequire(path.join(appRoot, 'package.json'));
const readEnv = filename => fs.existsSync(filename) ? require('dotenv').parse(fs.readFileSync(filename)) : {};
const identifier = value => '"' + value.replaceAll('"', '""') + '"';

export function createSqliteSource(filename) {
  let database;
  const db = () => database ||= new DatabaseSync(filename, { readOnly: true });
  const tableNames = () => db().prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name").all().map(row => row.name);
  const table = name => { if (!tableNames().includes(name)) throw new Error('Unknown table'); return identifier(name); };
  return {
    async ping() { db().prepare('SELECT 1').get(); },
    async tables() { return tableNames().map(name => ({ name, count: Number(db().prepare(`SELECT COUNT(*) AS count FROM ${table(name)}`).get().count) })); },
    async rows(name, page, limit) {
      const quoted = table(name);
      const columns = db().prepare(`PRAGMA table_info(${quoted})`).all().map(column => column.name);
      const total = Number(db().prepare(`SELECT COUNT(*) AS total FROM ${quoted}`).get().total);
      const rows = db().prepare(`SELECT * FROM ${quoted} LIMIT ? OFFSET ?`).all(limit, (page - 1) * limit);
      return { columns, rows, total, page, limit };
    },
    async schema(name) { return db().prepare(`PRAGMA table_info(${table(name)})`).all(); },
    async query(sql) { const statement = db().prepare(sql); const columns = statement.columns().map(column => column.name); return { columns, rows: statement.all() }; },
    async close() { database?.close(); },
  };
}

export function createPostgresSource(connectionString) {
  let pool;
  const getPool = () => {
    if (!pool) {
      const pgRequire = createRequire(path.join(workspaceRoot, 'FinSync/OxFin/ox-fin-web/package.json'));
      pool = new (pgRequire('pg').Pool)({ connectionString, connectionTimeoutMillis: 2500, max: 3 });
      pool.on('error', () => {});
    }
    return pool;
  };
  async function read(sql, values = []) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN READ ONLY');
      await client.query("SET LOCAL statement_timeout = '5000ms'");
      return await client.query({ text: sql, values, queryMode: 'extended' });
    } finally { await client.query('ROLLBACK').catch(() => {}); client.release(); }
  }
  const tableNames = async () => (await read("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")).rows.map(row => row.name);
  async function table(name) { if (!(await tableNames()).includes(name)) throw new Error('Unknown table'); return `public.${identifier(name)}`; }
  return {
    async ping() { await read('SELECT 1'); },
    async tables() {
      const names = await tableNames();
      return Promise.all(names.map(async name => ({ name, count: Number((await read(`SELECT COUNT(*) AS count FROM public.${identifier(name)}`)).rows[0].count) })));
    },
    async rows(name, page, limit) {
      const quoted = await table(name);
      const result = await read(`SELECT * FROM ${quoted} LIMIT $1 OFFSET $2`, [limit, (page - 1) * limit]);
      const total = Number((await read(`SELECT COUNT(*) AS total FROM ${quoted}`)).rows[0].total);
      return { columns: result.fields.map(field => field.name), rows: result.rows, total, page, limit };
    },
    async schema(name) {
      await table(name);
      return (await read("SELECT ordinal_position - 1 AS cid, column_name AS name, data_type AS type, CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END AS notnull, column_default AS dflt_value, 0 AS pk FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position", [name])).rows;
    },
    async query(sql) {
      const result = await read(sql);
      if (Array.isArray(result)) throw new Error('Use a single query');
      return { columns: result.fields.map(field => field.name), rows: result.rows };
    },
    async close() { await pool?.end(); },
  };
}

export function createDatabaseSources(env = process.env) {
  const ultimateEnv = readEnv(path.join(appRoot, '.env'));
  const oxfinEnv = readEnv(path.join(workspaceRoot, 'FinSync/OxFin/ox-fin-web/.env.local'));
  const familyEnv = readEnv(path.join(workspaceRoot, 'Family Connect/familyconnect/backend/.env'));
  const sqliteUrl = env.DB_STUDIO_SQLITE_URL || ultimateEnv.DATABASE_URL || 'file:./dev.db';
  const oxfinUrl = new URL(env.DB_STUDIO_OXFIN_URL || oxfinEnv.DATABASE_URL || 'postgresql://localhost:5434/oxfin');
  if (!env.DB_STUDIO_OXFIN_URL) oxfinUrl.port = env.OXFIN_DB_PORT || '5434';
  return new Map([
    ['ultimate', ultimateEnv.DATABASE_PROVIDER === 'sqlserver' || sqliteUrl.startsWith('sqlserver:')
      ? { name: 'Ultimate', provider: 'SQL Server', adapter: createSqlServerSource(ultimateEnv) }
      : { name: 'Ultimate', provider: 'SQLite', adapter: createSqliteSource(path.resolve(appRoot, sqliteUrl.replace(/^file:/, ''))) }],
    ['oxfin', { name: 'OxFin', provider: 'PostgreSQL', adapter: createPostgresSource(oxfinUrl.href) }],
    ['family', { name: 'Family Connect', provider: 'PostgreSQL', adapter: createPostgresSource(env.DB_STUDIO_FAMILY_URL || familyEnv.DATABASE_URL || 'postgresql://localhost:5432/familyconnect') }],
  ]);
}

export function createSqlServerSource(env) {
  let connection;
  const client = async () => (await (connection ||= createDatabaseClient(appRoot, env))).prisma;
  const read = async (query, ...parameters) => (await client()).$queryRawUnsafe(query, ...parameters);
  const names = async () => (await read("SELECT name FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') AND name NOT LIKE '\\_\\_%' ESCAPE '\\' ORDER BY name")).map(row => row.name);
  const quote = value => '[' + value.replaceAll(']', ']]') + ']';
  const table = async name => { if (!(await names()).includes(name)) throw new Error('Unknown table'); return `dbo.${quote(name)}`; };
  return {
    async ping() { await read('SELECT 1 AS online'); },
    async tables() {
      const tables = await names();
      return Promise.all(tables.map(async name => ({ name, count: Number((await read(`SELECT COUNT(*) AS count FROM dbo.${quote(name)}`))[0].count) })));
    },
    async rows(name, page, limit) {
      const target = await table(name);
      const columns = (await read("SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME=@P1 ORDER BY ORDINAL_POSITION", name)).map(row => row.name);
      const rows = await read(`SELECT * FROM ${target} ORDER BY ${quote(columns[0])} OFFSET @P1 ROWS FETCH NEXT @P2 ROWS ONLY`, (page - 1) * limit, limit);
      const total = Number((await read(`SELECT COUNT(*) AS total FROM ${target}`))[0].total);
      return { columns, rows, total, page, limit };
    },
    async schema(name) {
      await table(name);
      return read("SELECT ORDINAL_POSITION-1 AS cid,COLUMN_NAME AS name,DATA_TYPE AS type,CASE WHEN IS_NULLABLE='NO' THEN 1 ELSE 0 END AS [notnull],COLUMN_DEFAULT AS dflt_value,0 AS pk FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME=@P1 ORDER BY ORDINAL_POSITION", name);
    },
    async query() { throw new Error('Run custom T-SQL through SSMS. Studio exposes only bounded metadata and table reads for SQL Server.'); },
    async close() { if (connection) await (await connection).prisma.$disconnect(); },
  };
}
