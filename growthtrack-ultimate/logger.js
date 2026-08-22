/**
 * logger.js — GrowthTrack Winston Logger
 *
 * Writes structured JSON logs to rotating daily files in ./logs/
 * Retention: 14 days, max 20 MB per file.
 *
 * Usage in server.js:
 *   import { serverLogger, logToFile } from './logger.js';
 *   logToFile('info', 'Server started', { port: 3001 });
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ── Transport: rotating daily file ────────────────────────────────────────────
const rotatingTransport = new DailyRotateFile({
  filename: path.join(LOGS_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

// ── Transport: console (dev-friendly colorised output) ────────────────────────
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
  ),
});

// ── Logger instance ────────────────────────────────────────────────────────────
export const serverLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [rotatingTransport, consoleTransport],
});

/**
 * Convenience wrapper — logs an audit/session/login entry to the rotating file.
 * Mirrors the shape expected by the AuditLog Prisma model.
 *
 * @param {'info'|'warning'|'error'|'critical'} severity
 * @param {string} message  — human-readable summary
 * @param {object} meta     — additional structured fields (action, table, userId, etc.)
 */
export function logToFile(severity, message, meta = {}) {
  const level = severity === 'critical' ? 'error'
              : severity === 'warning'  ? 'warn'
              : severity;
  serverLogger.log(level, message, {
    ...meta,
    service: 'growthtrack-server',
  });
}

// Log startup
serverLogger.info('Winston logger initialized', {
  logsDir: LOGS_DIR,
  retentionDays: 14,
  maxFileSize: '20MB',
});
