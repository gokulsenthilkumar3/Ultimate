import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.WALLET_DB_URL }); }
  return pool;
}

export interface WalletRecord {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

export async function createWalletInDb(wallet: WalletRecord): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO wallets (id, user_id, currency, balance, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [wallet.id, wallet.user_id, wallet.currency, wallet.balance, wallet.created_at, wallet.updated_at],
    );
  } finally { client.release(); }
}

export async function listWalletsByUser(userId: string): Promise<WalletRecord[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT id, user_id, currency, balance, created_at, updated_at FROM wallets WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    );
    return result.rows;
  } finally { client.release(); }
}