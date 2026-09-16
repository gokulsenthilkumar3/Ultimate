import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import axios from 'axios';
import { createPaymentIntent, updatePaymentStatus, getPaymentById } from './db';

dotenv.config();

type Rail = 'UPI' | 'IMPS' | 'NEFT' | 'RTGS' | 'ACH' | 'SEPA' | 'SWIFT' | 'OX';
type PaymentStatus = 'created' | 'pending' | 'processing' | 'succeeded' | 'failed';

interface PaymentRequestPayload { source?: string; destination?: string; amount?: number; currency?: string; country?: string; rail?: Rail; purposeCode?: string; }
interface PaymentIntent { id: string; userId: string; source: string; destination: string; amount: number; currency: string; country: string; rail: Rail; purposeCode?: string; status: PaymentStatus; externalReference?: string; errorMessage?: string; createdAt: string; updatedAt: string; }

const payments: Record<string, PaymentIntent> = {};
const oxServiceUrl = process.env.OX_SERVICE_URL || `http://localhost:${process.env.OX_PORT || 3005}`;
const isPaymentsDbEnabled = !!process.env.PAYMENTS_DB_URL;

function generatePaymentId(): string { return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function selectRail(payload: PaymentRequestPayload): Rail {
  if (payload.rail) return payload.rail;
  switch (payload.country) {
    case 'IN': return 'UPI';
    case 'US': return 'ACH';
    case 'EU': return 'SEPA';
    default: return 'SWIFT';
  }
}

async function initiateOx(intent: PaymentIntent): Promise<{ status: PaymentStatus; externalReference: string }> {
  try {
    const response = await axios.post(`${oxServiceUrl}/v1/ox/transfers`, { toUserId: intent.destination.replace('ox_wallet:', ''), amountOx: intent.amount, senderCountry: intent.country, receiverCountry: intent.country }, { headers: { 'x-user-id': intent.userId } });
    const txResult = response.data as { transactions?: { outTx?: { id?: string } } };
    return { status: 'succeeded', externalReference: txResult.transactions?.outTx?.id ?? `OX-${intent.id}` };
  } catch { return { status: 'failed', externalReference: `OX-${intent.id}` }; }
}

async function simulateRailInitiation(rail: Rail, intent: PaymentIntent): Promise<{ status: PaymentStatus; externalReference: string }> {
  if (rail === 'OX') return initiateOx(intent);
  await new Promise((r) => setTimeout(r, 50));
  return { status: 'succeeded', externalReference: `${rail}-${intent.id}` };
}

const app = express();
const port = process.env.PAYMENTS_PORT || 3003;
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => { res.json({ status: 'ok', service: 'payments-service' }); });

app.post('/v1/payments', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  const { source, destination, amount, currency, country, rail, purposeCode } = req.body as PaymentRequestPayload;
  if (!source || !destination || !amount || !currency || !country) { res.status(400).json({ error: 'source, destination, amount, currency, and country are required' }); return; }
  if (amount <= 0) { res.status(400).json({ error: 'amount must be greater than zero' }); return; }
  const resolvedRail = selectRail({ source, destination, amount, currency, country, rail, purposeCode });
  const now = new Date().toISOString();
  const id = generatePaymentId();
  const intent: PaymentIntent = { id, userId, source, destination, amount, currency, country, rail: resolvedRail, purposeCode, status: 'pending', createdAt: now, updatedAt: now };
  payments[id] = intent;
  if (isPaymentsDbEnabled) { try { await createPaymentIntent({ id: intent.id, userId: intent.userId, source: intent.source, destination: intent.destination, amount: intent.amount, currency: intent.currency, country: intent.country, rail: intent.rail, purposeCode: intent.purposeCode, status: intent.status, createdAt: intent.createdAt, updatedAt: intent.updatedAt }); } catch (e) { console.error('Failed to persist payment intent', e); } }
  try {
    const railResult = await simulateRailInitiation(resolvedRail, intent);
    intent.status = railResult.status; intent.externalReference = railResult.externalReference; intent.updatedAt = new Date().toISOString(); payments[id] = intent;
    if (isPaymentsDbEnabled) { try { await updatePaymentStatus(intent.id, intent.status, intent.externalReference ?? null, intent.errorMessage ?? null, intent.updatedAt); } catch (e) { console.error('Failed to update payment status', e); } }
  } catch (err: any) {
    intent.status = 'failed'; intent.errorMessage = 'Failed to initiate payment on rail'; intent.updatedAt = new Date().toISOString(); payments[id] = intent;
    if (isPaymentsDbEnabled) { try { await updatePaymentStatus(intent.id, intent.status, null, intent.errorMessage, intent.updatedAt); } catch (e) { console.error('Failed to update failed status', e); } }
  }
  res.status(201).json({ payment: intent });
});

app.get('/v1/payments/:id', async (req: Request, res: Response) => {
  if (isPaymentsDbEnabled) {
    try {
      const record = await getPaymentById(req.params.id);
      if (record) {
        res.json({ payment: { id: record.id, userId: record.user_id, source: record.source, destination: record.destination, amount: Number(record.amount), currency: record.currency, country: record.country, rail: record.rail as Rail, purposeCode: record.purpose_code ?? undefined, status: record.status as PaymentStatus, externalReference: record.external_reference ?? undefined, errorMessage: record.error_message ?? undefined, createdAt: record.created_at.toISOString(), updatedAt: record.updated_at.toISOString() } });
        return;
      }
    } catch (e) { console.error('Failed to load payment from DB', e); }
  }
  const payment = payments[req.params.id];
  if (!payment) { res.status(404).json({ error: 'Payment not found' }); return; }
  res.json({ payment });
});

app.listen(port, () => { console.log(`Payments service listening on port ${port}`); });