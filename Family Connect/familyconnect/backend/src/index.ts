import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import treesRoutes from './routes/trees.routes';
import membersRoutes from './routes/members.routes';
import relationshipsRoutes from './routes/relationships.routes';
import eventsRoutes from './routes/events.routes';
import documentsRoutes from './routes/documents.routes';
import notificationsRoutes from './routes/notifications.routes';
import aiRoutes from './routes/ai.routes';
import { startCronJobs } from './services/cron.service';
import { globalLimiter, authLimiter } from './middlewares/rateLimiter.middleware';
import { requireAuth } from './middlewares/auth.middleware';
import { downloadDocument } from './controllers/documents.controller';
import { getJwtSecret } from './config/environment';
import { ultimateSession } from './controllers/auth.controller';
import { createReadinessProbe } from './services/readiness';

dotenv.config();
if (process.env.ULTIMATE_BRIDGE_SECRET) {
  if (!/^[a-f0-9]{64}$/i.test(process.env.ULTIMATE_BRIDGE_SECRET)) throw new Error('ULTIMATE_BRIDGE_SECRET must be 64 hexadecimal characters.');
  if (Boolean(process.env.ULTIMATE_OWNER_ID) !== Boolean(process.env.ULTIMATE_FAMILY_USER_ID)) throw new Error('Configure both Ultimate/Family owner link IDs together.');
} else getJwtSecret(); // Standalone mode retains its own explicit signing identity.

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.LISTEN_HOST || '0.0.0.0';
const ready = createReadinessProbe();

// Security & performance
app.use(helmet());
app.use(cors());
app.use(compression());                    // gzip all JSON responses
app.use(express.json({ limit: '2mb' }));   // cap request body size
app.use(globalLimiter);                    // 200 req/15 min per IP

// Static files
app.get('/uploads/:filename', requireAuth, downloadDocument);

// Routes
app.post('/api/v1/auth/ultimate-session', ultimateSession);
app.use('/api/v1/auth',          authLimiter, authRoutes);   // stricter limit on auth
app.use('/api/v1/trees',         treesRoutes);
app.use('/api/v1/members',       membersRoutes);
app.use('/api/v1/relationships', relationshipsRoutes);
app.use('/api/v1/events',        eventsRoutes);
app.use('/api/v1/documents',     documentsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/ai',            aiRoutes);
app.use('/api/v1', (_req, res) => res.status(404).json({ code: 'FAMILY_ROUTE_NOT_FOUND', error: 'This Family API route is not available in the running server build.' }));

// Health check
app.get('/ready', async (_req, res) => {
  const database = await ready();
  res.set('Cache-Control', 'no-store').status(database ? 200 : 503).json({ status: database ? 'ready' : 'unavailable', database: database ? 'reachable' : 'unavailable' });
});
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'family-connect-api', apiContract: 'family-native/1.2', timestamp: new Date().toISOString() });
});

const server = app.listen(Number(PORT), HOST, (error?: Error) => {
  // Express 5 passes listen errors to this callback. Ignoring the argument
  // falsely announces success and leaves a cron-only process behind.
  if (error) {
    console.error(`Family API failed to listen: ${(error as NodeJS.ErrnoException).code || 'LISTEN_FAILED'}`);
    process.exit(1);
  }
  startCronJobs();
  const address = server.address();
  console.log(JSON.stringify({ event: 'family.listening', pid: process.pid, port: typeof address === 'object' && address ? address.port : Number(PORT), apiContract: 'family-native/1.2' }));
});
