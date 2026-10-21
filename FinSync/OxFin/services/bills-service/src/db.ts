import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.BILLS_DB_URL });
  }
  return pool;
}

export interface BillRecord {
  id: string;
  user_id: string;
  biller_id: string;
  country: string;
  service_type: string;
  amount_due: number;
  currency: string;
  due_date: Date;
  status: string;
  source: string;
  created_at: Date;
  updated_at: Date;
}

export interface AutopayRuleRecord {
  id: string;
  user_id: string;
  biller_id: string;
  funding_source: string;
  type: string;
  schedule: string;
  max_amount_per_charge: number | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function createBill(bill: BillRecord): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO bills (id, user_id, biller_id, country, service_type, amount_due, currency, due_date, status, source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [bill.id, bill.user_id, bill.biller_id, bill.country, bill.service_type, bill.amount_due, bill.currency, bill.due_date, bill.status, bill.source, bill.created_at, bill.updated_at],
    );
  } finally {
    client.release();
  }
}

export async function listBillsByUser(userId: string): Promise<BillRecord[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT id, user_id, biller_id, country, service_type, amount_due, currency, due_date, status, source, created_at, updated_at
       FROM bills WHERE user_id = $1 ORDER BY due_date ASC`,
      [userId],
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function updateBillStatus(id: string, status: string, updatedAt: Date): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`UPDATE bills SET status = $2, updated_at = $3 WHERE id = $1`, [id, status, updatedAt]);
  } finally {
    client.release();
  }
}

export async function createAutopayRule(rule: AutopayRuleRecord): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO autopay_rules (id, user_id, biller_id, funding_source, type, schedule, max_amount_per_charge, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [rule.id, rule.user_id, rule.biller_id, rule.funding_source, rule.type, rule.schedule, rule.max_amount_per_charge, rule.active, rule.created_at, rule.updated_at],
    );
  } finally {
    client.release();
  }
}

export async function listAutopayRulesByUser(userId: string): Promise<AutopayRuleRecord[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT id, user_id, biller_id, funding_source, type, schedule, max_amount_per_charge, active, created_at, updated_at
       FROM autopay_rules WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function listScheduledBillsDue(now: Date): Promise<BillRecord[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT id, user_id, biller_id, country, service_type, amount_due, currency, due_date, status, source, created_at, updated_at
       FROM bills WHERE status = 'scheduled' AND due_date <= $1`,
      [now],
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function listActiveAutopayRulesForBiller(userId: string, billerId: string): Promise<AutopayRuleRecord[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT id, user_id, biller_id, funding_source, type, schedule, max_amount_per_charge, active, created_at, updated_at
       FROM autopay_rules WHERE user_id = $1 AND biller_id = $2 AND active = TRUE`,
      [userId, billerId],
    );
    return result.rows;
  } finally {
    client.release();
  }
}