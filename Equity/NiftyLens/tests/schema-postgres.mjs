import assert from 'node:assert/strict';
import fs from 'node:fs';

// The caller owns the transaction and must roll it back, including fixture roles.
// No application environments or Supabase services are accessed by this fixture.
export async function verifyNiftyLensSchema(client, suffix, { legacyManualTables = false } = {}) {
  assert.match(suffix, /^[a-z0-9_]+$/);
  const schema = `nifty_schema_${suffix}`;
  const authSchema = `nifty_auth_${suffix}`;
  const role = `nifty_client_${suffix}`;
  await client.query(`CREATE SCHEMA "${schema}"; CREATE SCHEMA "${authSchema}";
    SET LOCAL search_path TO "${schema}";
    CREATE TABLE "${authSchema}".users (id uuid PRIMARY KEY);
    CREATE FUNCTION "${authSchema}".uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION "${authSchema}".role() RETURNS text LANGUAGE sql STABLE
      AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;`);

  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.sql')).sort()) {
    let source = fs.readFileSync(new URL(name, dir), 'utf8');
    if (legacyManualTables && name.startsWith('002_')) {
      // Model installations that applied the original policy-only 002 against
      // manually created tables, before the missing CREATE TABLE definitions.
      await client.query(`CREATE TABLE watchlists (id uuid PRIMARY KEY, user_id uuid, symbol text, created_at timestamptz);
        CREATE TABLE portfolios (id uuid PRIMARY KEY, user_id uuid, symbol text, qty numeric, avg_price numeric, buy_date date, created_at timestamptz);
        CREATE TABLE alerts (id uuid PRIMARY KEY, user_id uuid, symbol text, condition text, threshold numeric, channel text, triggered_at timestamptz, created_at timestamptz);`);
      source = source.slice(source.indexOf('-- Migration 002:'));
    }
    // Supabase's publication is platform configuration; user table DDL and RLS
    // are replayed verbatim apart from isolated schema names and outer BEGIN.
    const sql = source
      .replace(/^\s*(?:BEGIN|COMMIT);\s*$/gmi, '')
      .replace(/^alter publication supabase_realtime add table public\.price_cache;\s*$/gmi, '')
      .replace(/\bpublic\./g, `"${schema}".`)
      .replace(/\bauth\./g, `"${authSchema}".`);
    await client.query(sql);
  }

  const owner = '00000000-0000-0000-0000-000000000001';
  const other = '00000000-0000-0000-0000-000000000002';
  await client.query(`INSERT INTO "${authSchema}".users VALUES ($1), ($2)`, [owner, other]);
  const reject = async (sql, parameters = [], code = '23514') => {
    await client.query('SAVEPOINT nifty_invalid');
    try { await assert.rejects(client.query(sql, parameters), error => error.code === code); }
    finally { await client.query('ROLLBACK TO SAVEPOINT nifty_invalid'); }
  };

  for (const bad of ['NaN', 'Infinity', '-Infinity', '0', '-1']) {
    await reject(`INSERT INTO portfolios(user_id,symbol,qty,avg_price,buy_date) VALUES ($1,'TEST',$2,1,'2026-11-01')`, [owner, bad]);
    await reject(`INSERT INTO alerts(user_id,symbol,condition,threshold,channel) VALUES ($1,'TEST','above',$2,'email')`, [owner, bad]);
  }
  for (const bad of ['NaN', 'Infinity', '-Infinity', '-1']) {
    await reject(`INSERT INTO portfolios(user_id,symbol,qty,avg_price,buy_date) VALUES ($1,'TEST',1,$2,'2026-11-01')`, [owner, bad]);
  }
  await reject(`INSERT INTO watchlists(user_id,symbol) VALUES ($1,'   ')`, [owner]);
  await reject(`INSERT INTO portfolios(user_id,symbol,qty,avg_price,buy_date) VALUES ($1,'TEST',NULL,1,'2026-11-01')`, [owner], '23502');
  await reject(`INSERT INTO portfolios(user_id,symbol,qty,avg_price,buy_date) VALUES ('00000000-0000-0000-0000-000000000003','TEST',1,1,'2026-11-01')`, [], '23503');
  await reject(`INSERT INTO alerts(user_id,symbol,condition,threshold,channel) VALUES ($1,'TEST','unknown',1,'email')`, [owner]);
  await reject(`INSERT INTO alerts(user_id,symbol,condition,threshold,channel) VALUES ($1,'TEST','above',1,'unknown')`, [owner]);
  await reject(`INSERT INTO price_cache(symbol,ltp,volume) VALUES ('TEST',1,-1)`);
  await reject(`INSERT INTO price_cache(symbol,ltp) VALUES ('TEST','NaN')`);
  await reject(`INSERT INTO price_cache(symbol,ltp) VALUES ('TEST',-1)`);
  await client.query(`INSERT INTO price_cache(symbol,ltp) VALUES ('TEST',0.29)`);

  await client.query(`CREATE ROLE "${role}" NOLOGIN;
    GRANT USAGE ON SCHEMA "${schema}", "${authSchema}" TO "${role}";
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${schema}" TO "${role}";
    SET LOCAL ROLE "${role}";`);
  try {
    await client.query("SELECT set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claim.role','authenticated',true)", [owner]);
    await client.query(`INSERT INTO portfolios(user_id,symbol,qty,avg_price,buy_date) VALUES ($1,'TEST',1,0.29,'2026-11-01')`, [owner]);
    await client.query(`INSERT INTO watchlists(user_id,symbol) VALUES ($1,'TEST')`, [owner]);
    await reject(`INSERT INTO watchlists(user_id,symbol) VALUES ($1,'TEST')`, [owner], '23505');
    await client.query(`INSERT INTO alerts(user_id,symbol,condition,threshold,channel) VALUES ($1,'TEST','above',1,'email')`, [owner]);
    await reject(`INSERT INTO watchlists(user_id,symbol) VALUES ($1,'PRIVATE')`, [other], '42501');
    await reject(`UPDATE portfolios SET user_id=$1`, [other], '42501');
    await reject(`INSERT INTO price_cache(symbol,ltp) VALUES ('CLIENT',1)`, [], '42501');
    assert.equal((await client.query('SELECT * FROM portfolios')).rowCount, 1);
    assert.equal((await client.query('SELECT * FROM watchlists')).rowCount, 1);
    assert.equal((await client.query('SELECT * FROM alerts')).rowCount, 1);
    await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [other]);
    assert.equal((await client.query('SELECT * FROM portfolios')).rowCount, 0);
    assert.equal((await client.query('SELECT * FROM watchlists')).rowCount, 0);
    assert.equal((await client.query('SELECT * FROM alerts')).rowCount, 0);
    assert.equal((await client.query('DELETE FROM portfolios')).rowCount, 0);
    await client.query("SELECT set_config('request.jwt.claim.sub','',true), set_config('request.jwt.claim.role','anon',true)");
    assert.equal((await client.query('SELECT * FROM price_cache')).rowCount, 1);
    assert.equal((await client.query('SELECT * FROM portfolios')).rowCount, 0);
  } finally { await client.query('RESET ROLE'); }
  await client.query(`DELETE FROM "${authSchema}".users WHERE id=$1`, [owner]);
  for (const table of ['portfolios', 'watchlists', 'alerts']) {
    assert.equal((await client.query(`SELECT * FROM ${table}`)).rowCount, 0, `${table}: ownership deletion cascades`);
  }
}
