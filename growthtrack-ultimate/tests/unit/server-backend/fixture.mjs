import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createPrivateStorage } from '../../../server/domains/privateStorage.js';

export async function migratedFixture(test, beforeMigration = () => {}) {
  const fixtureRoot = process.env.GROWTHTRACK_BACKEND_TEST_ROOT || os.tmpdir();
  const relativeRoot = path.relative(os.tmpdir(), fixtureRoot);
  if (relativeRoot && (!relativeRoot.startsWith('growthtrack-backend-suite-') || relativeRoot.includes(path.sep))) throw new Error('Unexpected fixture root.');
  const directory = await fs.mkdtemp(path.join(fixtureRoot, 'growthtrack-backend-test-'));
  const filename = path.join(directory, 'test.db');
  const database = new DatabaseSync(filename);
  try {
    database.exec('PRAGMA foreign_keys=ON');
    const migrations = new URL('../../../prisma/migrations/', import.meta.url);
    for (const name of (await fs.readdir(migrations)).sort()) {
      if (name === 'migration_lock.toml') continue;
      beforeMigration(database, name);
      database.exec(await fs.readFile(new URL(`${name}/migration.sql`, migrations), 'utf8'));
    }
    database.exec("INSERT OR IGNORE INTO User(id,email,passwordHash,fullName,referralCode) VALUES ('owner-a','a@example.test','hash','A','ref-a'),('owner-b','b@example.test','hash','B','ref-b')");
  } finally { database.close(); }
  const url = `file:${filename.replaceAll('\\', '/')}`;
  const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  test.after(async () => {
    await prisma.$disconnect();
    globalThis.gc?.();
    const relative = path.relative(fixtureRoot, directory);
    if (!relative.startsWith('growthtrack-backend-test-') || relative.includes(path.sep)) throw new Error('Unexpected test cleanup path.');
    // The suite parent removes locked native SQLite files after the worker exits.
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }).catch(error => {
      if (process.platform !== 'win32' || !['EBUSY', 'EPERM'].includes(error.code)) throw error;
      if (!process.env.GROWTHTRACK_BACKEND_TEST_ROOT) test.diagnostic(`Temporary SQLite fixture retained until native handles close: ${directory}`);
    });
  });
  return { prisma, url, directory };
}

// Never import server.js or use DATABASE_URL: every test owns a temporary SQLite file.
export async function isolatedFixture(test) {
  const fixtureRoot = process.env.GROWTHTRACK_BACKEND_TEST_ROOT || os.tmpdir();
  if (fixtureRoot !== os.tmpdir()) {
    const relative = path.relative(os.tmpdir(), fixtureRoot);
    if (!relative.startsWith('growthtrack-backend-suite-') || relative.includes(path.sep)) throw new Error('Unexpected fixture root.');
  }
  const directory = await fs.mkdtemp(path.join(fixtureRoot, 'growthtrack-backend-test-'));
  const url = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
  const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  const schema = `
    CREATE TABLE "User" (id TEXT PRIMARY KEY, subscriptionTier TEXT);
    INSERT INTO "User" VALUES ('owner-a', 'free'), ('owner-b', NULL);
    CREATE TABLE "Transaction" (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id),
      amount REAL, type TEXT, category TEXT, method TEXT, date TEXT, note TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdBy TEXT,
      updatedBy TEXT, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE "Document" (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id), title TEXT, url TEXT, data TEXT,
      storageKey TEXT, sizeBytes INTEGER, mimeType TEXT, sha256 TEXT, previewKind TEXT, encryptionFormat TEXT, encryptionKeyId TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdBy TEXT,
      updatedBy TEXT, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE "location_points" (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id),
      latitude REAL NOT NULL, longitude REAL NOT NULL, accuracyM REAL, source TEXT NOT NULL DEFAULT 'browser',
      capturedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdBy TEXT,
      updatedBy TEXT, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE "WorkoutSession" (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id), date TEXT, notes TEXT, duration_minutes INTEGER, volume REAL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdBy TEXT,
      updatedBy TEXT, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE "WorkoutExercise" (
      id TEXT PRIMARY KEY, sessionId TEXT NOT NULL REFERENCES "WorkoutSession"(id) ON DELETE CASCADE,
      exercise_name TEXT, sets INTEGER, reps INTEGER, weight_kg REAL, notes TEXT,
      source TEXT, metadataVersion INTEGER, setId TEXT, position INTEGER, setNumber INTEGER, completed BOOLEAN, payloadHash TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdBy TEXT,
      updatedBy TEXT, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE "social_profiles" (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id), provider TEXT NOT NULL, profileUrl TEXT,
      followers INTEGER NOT NULL DEFAULT 0, avgLikes INTEGER NOT NULL DEFAULT 0, avgViews INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1, sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdBy TEXT,
      updatedBy TEXT, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(userId, provider)
    );
  `;
  for (const statement of schema.split(';').map(sql => sql.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
  const storage = createPrivateStorage(path.join(directory, 'private-files'));
  test.after(async () => {
    await prisma.$disconnect();
    // Native libsql statement handles may otherwise linger until the next GC on Windows.
    globalThis.gc?.();
    const relative = path.relative(fixtureRoot, directory);
    if (!relative.startsWith('growthtrack-backend-test-') || relative.includes(path.sep)) throw new Error('Refusing to remove an unexpected test directory.');
    await fs.rm(directory, { recursive: true, force: true }).catch(error => {
      if (error.code !== 'EBUSY') throw error;
      if (!process.env.GROWTHTRACK_BACKEND_TEST_ROOT) test.diagnostic(`Temporary SQLite fixture retained until native handles close: ${directory}`);
    });
  });
  return { prisma, storage, directory, url };
}

export function request(body = {}, userId = 'owner-a', id) {
  return { body, user: { id: userId }, params: { id }, query: {}, headers: {} };
}

export function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
  };
}

export async function call(handler, req) {
  const res = response();
  await handler(req, res);
  return res;
}
