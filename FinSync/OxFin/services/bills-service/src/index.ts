import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import axios from 'axios';
import {
  createBill, listBillsByUser, updateBillStatus, createAutopayRule,
  listAutopayRulesByUser, listScheduledBillsDue, listActiveAutopayRulesForBiller,
  BillRecord, AutopayRuleRecord,
} from './db';

dotenv.config();

interface Bill {
  id: string; userId: string; billerId: string; country: string; serviceType: string;
  amountDue: number; currency: string; dueDate: string;
  status: 'detected' | 'pending_approval' | 'scheduled' | 'paid' | 'failed' | 'cancelled';
  source: 'sms' | 'email' | 'whatsapp' | 'manual' | 'api';
  createdAt: string; updatedAt: string;
}

interface AutopayRule {
  id: string; userId: string; billerId: string;
  fundingSource: 'wallet' | 'ox' | 'card';
  type: 'fixed_amount' | 'full_statement';
  schedule: 'on_due_date';
  maxAmountPerCharge?: number;
  active: boolean; createdAt: string; updatedAt: string;
}

const bills: Record<string, Bill> = {};
const autopayRules: Record<string, AutopayRule> = {};
const paymentsServiceUrl = process.env.PAYMENTS_SERVICE_URL || `http://localhost:${process.env.PAYMENTS_PORT || 3003}`;
const isBillsDbEnabled = !!process.env.BILLS_DB_URL;

function generateBillId(): string { return `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function generateAutopayId(): string { return `apr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

const app = express();
const port = process.env.BILLS_PORT || 3004;
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => { res.json({ status: 'ok', service: 'bills-service' }); });

app.get('/v1/bills', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  if (isBillsDbEnabled) {
    try {
      const dbBills = await listBillsByUser(userId);
      res.json({ bills: dbBills.map((r) => ({ id: r.id, userId: r.user_id, billerId: r.biller_id, country: r.country, serviceType: r.service_type, amountDue: r.amount_due, currency: r.currency, dueDate: r.due_date.toISOString(), status: r.status as Bill['status'], source: r.source as Bill['source'], createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() })) });
      return;
    } catch (err: any) { console.error('Failed to fetch bills from DB:', err.message); }
  }
  res.json({ bills: Object.values(bills).filter((b) => b.userId === userId) });
});

app.post('/v1/bills', (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  const { billerId, country, serviceType, amountDue, currency, dueDate, source } = req.body as { billerId?: string; country?: string; serviceType?: string; amountDue?: number; currency?: string; dueDate?: string; source?: Bill['source']; };
  if (!billerId || !country || !serviceType || !amountDue || !currency || !dueDate) { res.status(400).json({ error: 'billerId, country, serviceType, amountDue, currency, and dueDate are required' }); return; }
  const now = new Date().toISOString();
  const id = generateBillId();
  const bill: Bill = { id, userId, billerId, country, serviceType, amountDue, currency, dueDate, status: 'pending_approval', source: source ?? 'manual', createdAt: now, updatedAt: now };
  bills[id] = bill;
  res.status(201).json({ bill });
});

app.post('/v1/bills/:id/autopay', (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  const bill = bills[req.params.id];
  if (!bill || bill.userId !== userId) { res.status(404).json({ error: 'Bill not found' }); return; }
  const { fundingSource, type, maxAmountPerCharge } = req.body as { fundingSource?: AutopayRule['fundingSource']; type?: AutopayRule['type']; maxAmountPerCharge?: number; };
  if (!fundingSource || !type) { res.status(400).json({ error: 'fundingSource and type are required' }); return; }
  const now = new Date().toISOString();
  const id = generateAutopayId();
  const rule: AutopayRule = { id, userId, billerId: bill.billerId, fundingSource, type, schedule: 'on_due_date', maxAmountPerCharge, active: true, createdAt: now, updatedAt: now };
  autopayRules[id] = rule;
  bill.status = 'scheduled'; bill.updatedAt = now; bills[bill.id] = bill;
  res.status(201).json({ bill, autopayRule: rule });
});

app.get('/v1/autopay-rules', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  if (isBillsDbEnabled) {
    try {
      const dbRules = await listAutopayRulesByUser(userId);
      res.json({ autopayRules: dbRules.map((r) => ({ id: r.id, userId: r.user_id, billerId: r.biller_id, fundingSource: r.funding_source as AutopayRule['fundingSource'], type: r.type as AutopayRule['type'], schedule: r.schedule as AutopayRule['schedule'], maxAmountPerCharge: r.max_amount_per_charge ?? undefined, active: r.active, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() })) });
      return;
    } catch (err: any) { console.error('Failed to fetch autopay rules from DB:', err.message); }
  }
  res.json({ autopayRules: Object.values(autopayRules).filter((r) => r.userId === userId) });
});

app.post('/v1/autopay/execute-due', async (_req: Request, res: Response) => {
  const now = new Date();
  const executions: Array<{ billId: string; autopayRuleId: string; paymentId?: string; status: string }> = [];
  const billsToProcess = Object.values(bills).filter((b) => b.status === 'scheduled' && new Date(b.dueDate) <= now);
  for (const bill of billsToProcess) {
    const rulesForBiller = Object.values(autopayRules).filter((r) => r.userId === bill.userId && r.billerId === bill.billerId && r.active);
    if (rulesForBiller.length === 0) { executions.push({ billId: bill.id, autopayRuleId: '', status: 'no_active_rule' }); continue; }
    const rule = rulesForBiller[0];
    let amountToPay = bill.amountDue;
    if (rule.type === 'fixed_amount' && rule.maxAmountPerCharge && rule.maxAmountPerCharge > 0) { amountToPay = Math.min(rule.maxAmountPerCharge, bill.amountDue); }
    const source = rule.fundingSource === 'wallet' ? `wallet:${bill.userId}` : rule.fundingSource === 'ox' ? `ox_wallet:${bill.userId}` : `card:${bill.userId}`;
    try {
      const response = await axios.post(`${paymentsServiceUrl}/v1/payments`, { source, destination: `biller:${bill.billerId}`, amount: amountToPay, currency: bill.currency, country: bill.country, purposeCode: 'BILL_PAYMENT' }, { headers: { 'x-user-id': bill.userId } });
      const payment = response.data.payment as { id?: string; status?: string };
      bill.status = payment && payment.status === 'succeeded' ? 'paid' : 'failed';
      bill.updatedAt = new Date().toISOString(); bills[bill.id] = bill;
      executions.push({ billId: bill.id, autopayRuleId: rule.id, paymentId: payment?.id, status: bill.status });
    } catch (err: any) {
      bill.status = 'failed'; bill.updatedAt = new Date().toISOString(); bills[bill.id] = bill;
      executions.push({ billId: bill.id, autopayRuleId: rule.id, status: 'payment_error' });
    }
  }
  res.json({ executions });
});

app.listen(port, () => { console.log(`Bills service listening on port ${port}`); });