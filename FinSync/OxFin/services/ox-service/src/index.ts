import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { getOrCreateWalletFromDb, buyOxInDb, transferOxInDb, InsufficientOxBalance, OxWalletRecord, OxTransactionRecord } from './db';

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

function walletFromDb(row: OxWalletRecord): OxWallet {
  return {userId:row.user_id,balanceOx:Number(row.balance_ox),createdAt:row.created_at.toISOString(),updatedAt:row.updated_at.toISOString()};
}
function transactionFromDb(row: OxTransactionRecord): OxTransaction {
  return {id:row.id,userId:row.user_id,type:row.type as OxTransaction['type'],amountOx:Number(row.amount_ox),feeOx:Number(row.fee_ox),counterpartyUserId:row.counterparty_user_id ?? undefined,createdAt:row.created_at.toISOString()};
}

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
      res.json({ wallet: walletFromDb(dbWallet) });
      return;
    } catch (err: any) {
      console.error('Failed to fetch Ox wallet from DB:', err.message);
      res.status(503).json({error:'Ox database unavailable'}); return;
    }
  }
  res.json({ wallet: getOrCreateWallet(userId) });
});

app.post('/v1/ox/buy', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  const { amountChf } = req.body as { amountChf?: number };
  if (typeof amountChf !== 'number' || !Number.isFinite(amountChf) || amountChf <= 0) { res.status(400).json({ error: 'amountChf must be greater than zero' }); return; }
  if (isOxDbEnabled) {
    try {
      const result = await buyOxInDb(userId,amountChf,generateTxId());
      res.status(201).json({wallet:walletFromDb(result.wallet),transaction:transactionFromDb(result.transaction)});
    } catch (err: any) {
      console.error('Failed to persist Ox buy to DB:',err.message);
      res.status(503).json({error:'Ox purchase could not be saved'});
    }
    return;
  }
  const oxAmount = amountChf / 1.01;
  const feeOx = oxAmount * 0.01;
  const wallet = getOrCreateWallet(userId);
  wallet.balanceOx += oxAmount - feeOx;
  wallet.updatedAt = new Date().toISOString();
  oxWallets[userId] = wallet;
  const tx: OxTransaction = { id: generateTxId(), userId, type: 'buy', amountOx: oxAmount, feeOx, createdAt: new Date().toISOString() };
  oxTransactions.push(tx);
  res.status(201).json({ wallet, transaction: tx });
});

app.post('/v1/ox/transfers', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  const { toUserId, amountOx, senderCountry, receiverCountry } = req.body as { toUserId?: string; amountOx?: number; senderCountry?: string; receiverCountry?: string; };
  if (typeof toUserId !== 'string' || !toUserId || toUserId === userId || typeof amountOx !== 'number' || !Number.isFinite(amountOx) || amountOx <= 0) { res.status(400).json({ error: 'A distinct toUserId and positive amountOx are required' }); return; }
  const domestic = Boolean(senderCountry && receiverCountry && senderCountry === receiverCountry);
  if (isOxDbEnabled) {
    try {
      const result = await transferOxInDb(userId,toUserId,amountOx,domestic,generateTxId(),generateTxId());
      res.status(201).json({senderWallet:walletFromDb(result.senderWallet),receiverWallet:walletFromDb(result.receiverWallet),transactions:{outTx:transactionFromDb(result.outTx),inTx:transactionFromDb(result.inTx)}});
    } catch (err: any) {
      console.error('Failed to persist Ox transfer to DB:',err.message);
      res.status(err instanceof InsufficientOxBalance ? 400 : 503).json({error:err instanceof InsufficientOxBalance ? 'Insufficient Ox balance' : 'Ox transfer could not be saved'});
    }
    return;
  }
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
  res.status(201).json({ senderWallet, receiverWallet, transactions: { outTx, inTx } });
});

app.listen(port, () => { console.log(`Ox service listening on port ${port}`); });
