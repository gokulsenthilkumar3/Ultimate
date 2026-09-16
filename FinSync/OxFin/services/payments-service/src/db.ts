import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) { pool = new Pool({ connectionString: process.env.PAYMENTS_DB_URL }); }
  return pool;
}

export interface PaymentIntentRecord {
  id: string; user_id: string; source: string; destination: string; amount: number;
  currency: string; country: string; rail: string; purpose_code: string | null;
  status: string; external_reference: string | null; error_message: string | null;
  created_at: Date; updated_at: Date;
}

export async function createPaymentIntent(intent: { id: string; userId: string; source: string; destination: string; amount: number; currency: string; country: string; rail: string; purposeCode?: string; status: string; createdAt: string; updatedAt: string; }): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO payments (id, user_id, source, destination, amount, currency, country, rail, purpose_code, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [intent.id, intent.userId, intent.source, intent.destination, intent.amount, intent.currency, intent.country, intent.rail, intent.purposeCode ?? null, intent.status, intent.createdAt, intent.updatedAt],
    );
  } finally { client.release(); }
}

export async function updatePaymentStatus(id: string, status: string, externalReference: string | null, errorMessage: string | null, updatedAt: string): Promise<void> {
  const client = await getPool().connect();
  try { await client.query(`UPDATE payments SET status=$2, external_reference=$3, error_message=$4, updated_at=$5 WHERE id=$1`, [id, status, externalReference, errorMessage, updatedAt]); }
  finally { client.release(); }
}

export async function getPaymentById(id: string): Promise<PaymentIntentRecord | null> {
  const client = await getPool().connect();
  try {
    const result = await client.query(`SELECT id, user_id, source, destination, amount, currency, country, rail, purpose_code, status, external_reference, error_message, created_at, updated_at FROM payments WHERE id=$1`, [id]);
    return result.rowCount === 0 ? null : result.rows[0];
  } finally { client.release(); }
}