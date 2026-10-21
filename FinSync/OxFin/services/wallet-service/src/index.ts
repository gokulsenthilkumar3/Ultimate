import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createWalletInDb, listWalletsByUser, WalletRecord } from './db';

dotenv.config();

interface Wallet {
  id: string;
  userId: string;
  currency: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

const wallets: Record<string, Wallet[]> = {};
const isWalletDbEnabled = !!process.env.WALLET_DB_URL;

function generateWalletId(): string {
  return `wlt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const app = express();
const port = process.env.WALLET_PORT || 3002;
app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'wallet-service' });
});

app.get('/v1/wallets', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  if (isWalletDbEnabled) {
    try {
      const dbWallets = await listWalletsByUser(userId);
      res.json({
        wallets: dbWallets.map((r: WalletRecord) => ({
          id: r.id, userId: r.user_id, currency: r.currency,
          balance: r.balance, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
        }))
      });
      return;
    } catch (err: any) { console.error('Failed to fetch wallets from DB:', err.message); }
  }
  res.json({ wallets: wallets[userId] ?? [] });
});

app.post('/v1/wallets', async (req: Request, res: Response) => {
  const userId = req.header('x-user-id');
  if (!userId) { res.status(401).json({ error: 'Missing user context' }); return; }
  const { currency } = req.body as { currency?: string };
  if (!currency) { res.status(400).json({ error: 'currency is required' }); return; }
  const now = new Date().toISOString();
  const id = generateWalletId();
  const wallet: Wallet = { id, userId, currency, balance: 0, createdAt: now, updatedAt: now };
  if (!wallets[userId]) wallets[userId] = [];
  wallets[userId].push(wallet);
  if (isWalletDbEnabled) {
    try {
      await createWalletInDb({ id, user_id: userId, currency, balance: 0, created_at: new Date(now), updated_at: new Date(now) });
    } catch (err: any) { console.error('Failed to persist wallet to DB:', err.message); }
  }
  res.status(201).json({ wallet });
});

app.listen(port, () => { console.log(`Wallet service listening on port ${port}`); });