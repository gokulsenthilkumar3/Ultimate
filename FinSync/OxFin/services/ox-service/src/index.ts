import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { getOrCreateWalletFromDb, updateWalletBalance, insertTransaction, OxTransactionRecord } from './db';

dotenv.config();

interface OxWallet { userId: string; balanceOx: number; createdAt: string; updatedAt: string; }
interface OxTransaction { id: string; userId: string; type: 'buy' | 'transfer_out' | 'transfer_in'; amountOx: number; feeOx: number; counterpartyUserId?: string; createdAt: string; }

const oxWallets: Record<string, OxWallet> = {};
const oxTransactions: OxTransaction[] = [];
const isOxDbEnabled = !!process.env.OX_DB_URL;

function getOrCreateWallet(userId: string): OxWallet {
  if (oxWallets[userId]) return oxWallets[userId];
  const now = new Date().toISOString();
  oxWallets[userId] = { userId, balanceOx: 0, createdAt: now, updatedAt: now };
  return oxWallets[userId];
}

function generateTxId(): string { return `ox_tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

const app = express();
const port = process.env.OX_PORT || 3005;
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => { res.json({ status: 'ok', service: 'ox-service' }); });

app.get('/v1/ox/wallet', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  if (isOxDbEnabled) {
    try {
      const dbWallet = await getOrCreateWalletFromDb(userId);
      res.json({ wallet: { userId: dbWallet.user_id, balanceOx: dbWallet.balance_ox, createdAt: dbWallet.created_at.toISOString(), updatedAt: dbWallet.updated_at.toISOString() } });
      return;
    } catch (err: any) { console.error('Failed to fetch Ox wallet from DB:', err.message); }
  }
  res.json({ wallet: getOrCreateWallet(userId) });
});

app.post('/v1/ox/buy', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  const { amountChf } = req.body as { amountChf?: number };
  if (!amountChf || amountChf <= 0) { res.status(400).json({ error: 'amountChf must be greater than zero' }); return; }
  const oxAmount = amountChf / 1.01;
  const feeOx = oxAmount * 0.01;
  const wallet = getOrCreateWallet(userId);
  wallet.balanceOx += oxAmount - feeOx;
  wallet.updatedAt = new Date().toISOString();
  oxWallets[userId] = wallet;
  const tx: OxTransaction = { id: generateTxId(), userId, type: 'buy', amountOx: oxAmount, feeOx, createdAt: new Date().toISOString() };
  oxTransactions.push(tx);
  if (isOxDbEnabled) {
    try {
      await updateWalletBalance(userId, wallet.balanceOx);
      await insertTransaction({ id: tx.id, user_id: tx.userId, type: tx.type, amount_ox: tx.amountOx, fee_ox: tx.feeOx, counterparty_user_id: null, created_at: new Date(tx.createdAt) });
    } catch (err: any) { console.error('Failed to persist Ox buy to DB:', err.message); }
  }
  res.status(201).json({ wallet, transaction: tx });
});

app.post('/v1/ox/transfers', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  const { toUserId, amountOx, senderCountry, receiverCountry } = req.body as { toUserId?: string; amountOx?: number; senderCountry?: string; receiverCountry?: string; };
  if (!toUserId || !amountOx || amountOx <= 0) { res.status(400).json({ error: 'toUserId and positive amountOx are required' }); return; }
  const domestic = senderCountry && receiverCountry && senderCountry === receiverCountry;
  let feeOx = amountOx * (domestic ? 0.01 : 0.02);
  if (!domestic && feeOx < 2) feeOx = 2;
  const senderWallet = getOrCreateWallet(userId);
  if (senderWallet.balanceOx < amountOx + feeOx) { res.status(400).json({ error: 'Insufficient Ox balance' }); return; }
  const receiverWallet = getOrCreateWallet(toUserId);
  senderWallet.balanceOx -= amountOx + feeOx; senderWallet.updatedAt = new Date().toISOString(); oxWallets[userId] = senderWallet;
  receiverWallet.balanceOx += amountOx; receiverWallet.updatedAt = new Date().toISOString(); oxWallets[toUserId] = receiverWallet;
  const now = new Date().toISOString();
  const outTx: OxTransaction = { id: generateTxId(), userId, type: 'transfer_out', amountOx, feeOx, counterpartyUserId: toUserId, createdAt: now };
  const inTx: OxTransaction = { id: generateTxId(), userId: toUserId, type: 'transfer_in', amountOx, feeOx: 0, counterpartyUserId: userId, createdAt: now };
  oxTransactions.push(outTx, inTx);
  if (isOxDbEnabled) {
    try {
      await updateWalletBalance(userId, senderWallet.balanceOx);
      await updateWalletBalance(toUserId, receiverWallet.balanceOx);
      await insertTransaction({ id: outTx.id, user_id: outTx.userId, type: outTx.type, amount_ox: outTx.amountOx, fee_ox: outTx.feeOx, counterparty_user_id: outTx.counterpartyUserId ?? null, created_at: new Date(outTx.createdAt) });
      await insertTransaction({ id: inTx.id, user_id: inTx.userId, type: inTx.type, amount_ox: inTx.amountOx, fee_ox: inTx.feeOx, counterparty_user_id: inTx.counterpartyUserId ?? null, created_at: new Date(inTx.createdAt) });
    } catch (err: any) { console.error('Failed to persist Ox transfer to DB:', err.message); }
  }
  res.status(201).json({ senderWallet, receiverWallet, transactions: { outTx, inTx } });
});

app.listen(port, () => { console.log(`Ox service listening on port ${port}`); });