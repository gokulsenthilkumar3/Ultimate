import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const port = process.env.IDENTITY_PORT || 3001;
const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN_SECONDS = 3600;

app.use(helmet()); app.use(cors()); app.use(express.json()); app.use(morgan('dev'));

app.get('/health', (_req: Request, res: Response) => { res.json({ status: 'ok', service: 'identity-service' }); });

app.post('/v1/auth/register', (req: Request, res: Response) => {
  const { phoneOrEmail, password } = req.body as { phoneOrEmail?: string; password?: string };
  if (!phoneOrEmail || !password) { res.status(400).json({ error: 'phoneOrEmail and password are required' }); return; }
  const userId = `user_${Buffer.from(phoneOrEmail).toString('hex').slice(0, 16)}`;
  const payload = { sub: userId, phoneOrEmail };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_SECONDS });
  res.status(201).json({ accessToken, tokenType: 'Bearer', expiresIn: JWT_EXPIRES_IN_SECONDS, user: { id: userId, phoneOrEmail } });
});

app.post('/v1/auth/login', (req: Request, res: Response) => {
  const { phoneOrEmail } = req.body as { phoneOrEmail?: string };
  if (!phoneOrEmail) { res.status(400).json({ error: 'phoneOrEmail is required' }); return; }
  const userId = `user_${Buffer.from(phoneOrEmail).toString('hex').slice(0, 16)}`;
  const payload = { sub: userId, phoneOrEmail };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_SECONDS });
  res.json({ accessToken: token, tokenType: 'Bearer', expiresIn: JWT_EXPIRES_IN_SECONDS, user: { id: userId, phoneOrEmail } });
});

app.post('/v1/auth/refresh', (req: Request, res: Response) => {
  const { accessToken } = req.body as { accessToken?: string };
  if (!accessToken) { res.status(400).json({ error: 'accessToken is required' }); return; }
  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET) as { sub: string; phoneOrEmail?: string };
    const newToken = jwt.sign({ sub: decoded.sub, phoneOrEmail: decoded.phoneOrEmail }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_SECONDS });
    res.json({ accessToken: newToken, tokenType: 'Bearer', expiresIn: JWT_EXPIRES_IN_SECONDS });
  } catch (err) { res.status(401).json({ error: 'Invalid or expired token' }); }
});

app.post('/v1/consents', (req: Request, res: Response) => {
  const { userId, sms, email, whatsapp } = req.body as { userId?: string; sms?: boolean; email?: boolean; whatsapp?: boolean; };
  if (!userId) { res.status(400).json({ error: 'userId is required' }); return; }
  res.status(201).json({ userId, consents: { sms: sms ?? false, email: email ?? false, whatsapp: whatsapp ?? false } });
});

app.listen(port, () => { console.log(`Identity service listening on port ${port}`); });