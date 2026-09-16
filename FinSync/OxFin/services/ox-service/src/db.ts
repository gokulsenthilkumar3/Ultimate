import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.OX_DB_URL }); }
  return pool;
}

export interface OxWalletRecord { user_id: string; balance_ox: number; created_at: Date; updated_at: Date; }
export interface OxTransactionRecord { id: string; user_id: string; type: string; amount_ox: number; fee_ox: number; counterparty_user_id: string | null; created_at: Date; }

export async function getOrCreateWalletFromDb(userId: string): Promise<OxWalletRecord> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`SELECT user_id, balance_ox, created_at, updated_at FROM ox_wallets WHERE user_id = $1`, [userId]);
    if (result.rowCount > 0) return result.rows[0];
    const now = new Date();
    await client.query(`INSERT INTO ox_wallets (user_id, balance_ox, created_at, updated_at) VALUES ($1, $2, $3, $4)`, [userId, 0, now, now]);
    return { user_id: userId, balance_ox: 0, created_at: now, updated_at: now };
  } finally { client.release(); }
}

export async function updateWalletBalance(userId: string, balanceOx: number): Promise<void> {
  const client = await getPool().connect();
  try { await client.query(`UPDATE ox_wallets SET balance_ox = $2, updated_at = $3 WHERE user_id = $1`, [userId, balanceOx, new Date()]); }
  finally { client.release(); }
}

export async function insertTransaction(tx: OxTransactionRecord): Promise<void> {
  const client = await getPool().connect();
  try { await client.query(`INSERT INTO ox_transactions (id, user_id, type, amount_ox, fee_ox, counterparty_user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [tx.id, tx.user_id, tx.type, tx.amount_ox, tx.fee_ox, tx.counterparty_user_id, tx.created_at]); }
  finally { client.release(); }
}