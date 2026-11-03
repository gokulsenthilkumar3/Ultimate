import { Pool, type PoolClient } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.OX_DB_URL }); }
  return pool;
}

export interface OxWalletRecord { user_id: string; balance_ox: number | string; created_at: Date; updated_at: Date; }
export interface OxTransactionRecord { id: string; user_id: string; type: string; amount_ox: number | string; fee_ox: number | string; counterparty_user_id: string | null; created_at: Date; }

export async function getOrCreateWalletFromDb(userId: string): Promise<OxWalletRecord> {
  const client = await getPool().connect();
  try {
    await client.query('INSERT INTO ox_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    const result = await client.query('SELECT user_id, balance_ox, created_at, updated_at FROM ox_wallets WHERE user_id=$1', [userId]);
    return result.rows[0];
  } finally { client.release(); }
}

type ConnectionPool = { connect(): Promise<PoolClient> };

async function inTransaction<T>(database: ConnectionPool, task: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await task(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function buyOxInDb(userId: string, amountChf: number, transactionId: string, database: ConnectionPool = getPool()): Promise<{ wallet: OxWalletRecord; transaction: OxTransactionRecord }> {
  return inTransaction(database, async client => {
    await client.query('INSERT INTO ox_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
    const amounts = (await client.query('SELECT $1::numeric / 1.01 AS amount_ox, ($1::numeric / 1.01) * 0.01 AS fee_ox', [amountChf])).rows[0];
    const wallet = (await client.query(`UPDATE ox_wallets SET balance_ox=balance_ox + $2::numeric - $3::numeric, updated_at=now()
      WHERE user_id=$1 RETURNING user_id,balance_ox,created_at,updated_at`, [userId, amounts.amount_ox, amounts.fee_ox])).rows[0];
    const transaction = (await client.query(`INSERT INTO ox_transactions(id,user_id,type,amount_ox,fee_ox)
      VALUES ($1,$2,'buy',$3,$4) RETURNING *`, [transactionId, userId, amounts.amount_ox, amounts.fee_ox])).rows[0];
    return {wallet, transaction};
  });
}

export class InsufficientOxBalance extends Error {}

export async function transferOxInDb(userId: string, toUserId: string, amountOx: number, domestic: boolean, outId: string, inId: string, database: ConnectionPool = getPool()): Promise<{ senderWallet: OxWalletRecord; receiverWallet: OxWalletRecord; outTx: OxTransactionRecord; inTx: OxTransactionRecord }> {
  if (userId === toUserId) throw new Error('Choose a different recipient');
  return inTransaction(database, async client => {
    // Create and lock wallets in the same order for opposite-direction transfers.
    for (const id of [userId,toUserId].sort()) {
      await client.query('INSERT INTO ox_wallets(user_id) VALUES ($1) ON CONFLICT(user_id) DO NOTHING', [id]);
    }
    await client.query('SELECT user_id FROM ox_wallets WHERE user_id=ANY($1::text[]) ORDER BY user_id FOR UPDATE', [[userId,toUserId]]);
    const fee = (await client.query('SELECT CASE WHEN $2::boolean THEN $1::numeric * 0.01 ELSE greatest($1::numeric * 0.02,2) END AS fee_ox', [amountOx,domestic])).rows[0].fee_ox;
    const senderWallet = (await client.query(`UPDATE ox_wallets SET balance_ox=balance_ox-$2::numeric-$3::numeric,updated_at=now()
      WHERE user_id=$1 AND balance_ox >= $2::numeric+$3::numeric RETURNING *`, [userId,amountOx,fee])).rows[0];
    if (!senderWallet) throw new InsufficientOxBalance('Insufficient Ox balance');
    const receiverWallet = (await client.query(`UPDATE ox_wallets SET balance_ox=balance_ox+$2::numeric,updated_at=now()
      WHERE user_id=$1 RETURNING *`, [toUserId,amountOx])).rows[0];
    const rows: OxTransactionRecord[] = (await client.query(`INSERT INTO ox_transactions(id,user_id,type,amount_ox,fee_ox,counterparty_user_id)
      VALUES ($1,$2,'transfer_out',$3,$4,$5),($6,$5,'transfer_in',$3,0,$2) RETURNING *`, [outId,userId,amountOx,fee,toUserId,inId])).rows;
    const outTx = rows.find(row => row.id === outId);
    const inTx = rows.find(row => row.id === inId);
    if (!outTx || !inTx) throw new Error('Ox transfer ledger was not saved');
    return {senderWallet,receiverWallet,outTx,inTx};
  });
}
