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
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security & performance
app.use(helmet());
app.use(cors());
app.use(compression());                    // gzip all JSON responses
app.use(express.json({ limit: '2mb' }));   // cap request body size
app.use(globalLimiter);                    // 200 req/15 min per IP

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/v1/auth',          authLimiter, authRoutes);   // stricter limit on auth
app.use('/api/v1/trees',         treesRoutes);
app.use('/api/v1/members',       membersRoutes);
app.use('/api/v1/relationships', relationshipsRoutes);
app.use('/api/v1/events',        eventsRoutes);
app.use('/api/v1/documents',     documentsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/ai',            aiRoutes);

// Background jobs
startCronJobs();

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
