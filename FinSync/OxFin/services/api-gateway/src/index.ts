import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import axios from 'axios';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || `http://localhost:${process.env.IDENTITY_PORT || 3001}`;
const walletServiceUrl = process.env.WALLET_SERVICE_URL || `http://localhost:${process.env.WALLET_PORT || 3002}`;
const paymentsServiceUrl = process.env.PAYMENTS_SERVICE_URL || `http://localhost:${process.env.PAYMENTS_PORT || 3003}`;
const billsServiceUrl = process.env.BILLS_SERVICE_URL || `http://localhost:${process.env.BILLS_PORT || 3004}`;
const oxServiceUrl = process.env.OX_SERVICE_URL || `http://localhost:${process.env.OX_PORT || 3005}`;

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-secret-change-me';

// Simple in-memory rate limiter (for production, use Redis)
const rateLimits: Record<string, { count: number; resetAt: number }> = {};

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.user?.sub || req.ip || 'anonymous';
    const now = Date.now();
    const limit = rateLimits[key];
    if (!limit || now > limit.resetAt) {
      rateLimits[key] = { count: 1, resetAt: now + windowMs };
      next();
      return;
    }
    if (limit.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests, please try again later' });
      return;
    }
    limit.count += 1;
    next();
  };
}

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

interface AuthPayload {
  sub: string;
  phoneOrEmail?: string;
  [key: string]: unknown;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      user?: AuthPayload;
    }
  }
}

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = authHeader.substring('Bearer '.length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function forwardError(res: Response, error: any, fallbackMessage: string): void {
  if (error.response) {
    res.status(error.response.status).json(error.response.data);
  } else if (error.request) {
    res.status(502).json({ error: fallbackMessage, detail: 'No response from upstream service' });
  } else {
    res.status(500).json({ error: fallbackMessage, detail: error.message ?? 'Unknown error' });
  }
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

app.post('/v1/auth/register', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${identityServiceUrl}/v1/auth/register`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach identity service');
  }
});

app.post('/v1/auth/login', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${identityServiceUrl}/v1/auth/login`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach identity service');
  }
});

app.post('/v1/auth/refresh', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${identityServiceUrl}/v1/auth/refresh`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach identity service');
  }
});

app.post('/v1/consents', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${identityServiceUrl}/v1/consents`, req.body, {
      headers: { Authorization: req.headers.authorization ?? '' },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach identity service');
  }
});

app.get('/v1/wallets', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${walletServiceUrl}/v1/wallets`, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach wallet service');
  }
});

app.post('/v1/wallets', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${walletServiceUrl}/v1/wallets`, req.body, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach wallet service');
  }
});

app.post('/v1/payments', authenticate, rateLimit(10, 60000), async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${paymentsServiceUrl}/v1/payments`, req.body, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach payments service');
  }
});

app.get('/v1/bills', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${billsServiceUrl}/v1/bills`, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach bills service');
  }
});

app.post('/v1/bills', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${billsServiceUrl}/v1/bills`, req.body, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach bills service');
  }
});

app.post('/v1/bills/:id/autopay', authenticate, rateLimit(10, 60000), async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${billsServiceUrl}/v1/bills/${req.params.id}/autopay`, req.body, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach bills service');
  }
});

app.get('/v1/autopay-rules', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${billsServiceUrl}/v1/autopay-rules`, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach bills service');
  }
});

app.post('/v1/autopay/execute-due', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${billsServiceUrl}/v1/autopay/execute-due`, req.body, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach bills service');
  }
});

app.get('/v1/ox/wallet', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${oxServiceUrl}/v1/ox/wallet`, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach ox service');
  }
});

app.post('/v1/ox/buy', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${oxServiceUrl}/v1/ox/buy`, req.body, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach ox service');
  }
});

app.post('/v1/ox/transfers', authenticate, async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${oxServiceUrl}/v1/ox/transfers`, req.body, {
      headers: {
        Authorization: req.headers.authorization ?? '',
        'x-user-id': req.user?.sub ?? '',
        'x-user-email': req.user?.phoneOrEmail ?? '',
      },
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    forwardError(res, error, 'Failed to reach ox service');
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API Gateway listening on port ${port}`);
});