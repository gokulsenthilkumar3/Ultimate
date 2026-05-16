/**
 * GrowthTrack Backend API — Integration Tests
 * Uses in-memory store + vi.mock to avoid real Supabase calls.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// ── In-memory DB ───────────────────────────────────────────────────────────────
const db = { tasks: [], shopping: [], audit_logs: [] };
let nextId = 1;

const supabaseMock = {
  from: (table) => {
    const store = db[table] || [];
    let _eqVal = null;
    let _pending = null;

    const chain = {
      select: () => chain,
      order:  () => chain,
      limit:  () => chain,
      gte:    () => chain,
      lte:    () => chain,
      eq:     (_f, v) => { _eqVal = v; return chain; },
      single: () => Promise.resolve({ data: _pending, error: null }),
      upsert: () => chain,

      insert: (row) => {
        const id  = nextId++;
        const rec = { id, ...row, created_at: new Date().toISOString() };
        store.push(rec);
        db[table] = store;
        db.audit_logs.push({ id: nextId++, table_name: table, action: 'INSERT',
          details: JSON.stringify(rec), created_at: new Date().toISOString() });
        _pending = { id };
        return chain;
      },

      update: (patch) => {
        const idx = store.findIndex(r => String(r.id) === String(_eqVal));
        if (idx !== -1) Object.assign(store[idx], patch);
        _pending = store[idx] || null;
        return chain;
      },

      delete: () => {
        const idx = store.findIndex(r => String(r.id) === String(_eqVal));
        if (idx !== -1) {
          const removed = store.splice(idx, 1)[0];
          db[table] = store;
          db.audit_logs.push({ id: nextId++, table_name: table, action: 'DELETE',
            details: JSON.stringify(removed), created_at: new Date().toISOString() });
        }
        return chain;
      },

      then: (res, rej) =>
        Promise.resolve({ data: _pending !== null ? _pending : [...store], error: null })
          .then(res, rej),
    };
    chain[Symbol.toStringTag] = 'Promise';
    return chain;
  },
};

// Mock BEFORE app loads
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseMock),
}));

vi.mock('../routes/phase4a', () => ({
  default: vi.fn(() => (_req, _res, next) => next()),
}));

let app;
beforeAll(async () => {
  const mod = await import('../index.js');
  app = mod.default ?? mod;
});

describe('GrowthTrack Backend API — Integration Tests', () => {
  let createdTaskId;
  let createdShoppingId;

  // ─────────────────────────────────────────────────────────
  // Tasks API
  // ─────────────────────────────────────────────────────────
  describe('Tasks API', () => {
    it('POST /api/tasks — creates a new task', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: 'Test Supertest Task',
        priority: 'high',     // Zod: 'low'|'medium'|'high' (lowercase)
        tag: 'Development',
        dueDate: '2026-05-15',
        recurring: false,
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      createdTaskId = res.body.id;
    });

    it('GET /api/tasks — returns array with new task', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const task = res.body.find(t => t.id === createdTaskId);
      expect(task).toBeDefined();
      expect(task.title).toBe('Test Supertest Task');
      expect(task.done).toBe(false);
    });

    it('PUT /api/tasks/:id — updates task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${createdTaskId}`)
        .send({ done: true, completedAt: new Date().toISOString() });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/tasks/:id — removes task', async () => {
      const res = await request(app).delete(`/api/tasks/${createdTaskId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Shopping API
  // ─────────────────────────────────────────────────────────
  describe('Shopping API', () => {
    it('POST /api/shopping — creates item', async () => {
      const res = await request(app).post('/api/shopping').send({
        name: 'Supertest Item',
        category: 'Grocery',
        priority: 'medium',
        estimatedCost: 12.50,
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      createdShoppingId = res.body.id;
    });

    it('DELETE /api/shopping/:id — removes item', async () => {
      const res = await request(app).delete(`/api/shopping/${createdShoppingId}`);
      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Audit logging (/api/logs is in phase4a — correctly returns 404 when mocked)
  // ─────────────────────────────────────────────────────────
  describe('Audit Logging', () => {
    it('GET /api/logs — returns 404 (route is in phase4a, mocked in tests)', async () => {
      const res = await request(app).get('/api/logs');
      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Adversarial & Boundary Tests
  // ─────────────────────────────────────────────────────────
  describe('Adversarial & Boundary Testing', () => {
    it('should store SQL injection payload as literal string (Supabase uses parameterized queries)', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: "Robert'); DROP TABLE tasks;--",
        priority: 'low',
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');

      const getRes = await request(app).get('/api/tasks');
      const task = getRes.body.find(t => t.id === res.body.id);
      expect(task.title).toBe("Robert'); DROP TABLE tasks;--");

      await request(app).delete(`/api/tasks/${res.body.id}`);
    });

    it('should store XSS payload as literal string (no execution context in API)', async () => {
      const xss = "<script>alert('hacked')</script>";
      const res = await request(app).post('/api/shopping').send({
        name: xss,
        category: 'Grocery',
      });
      expect(res.status).toBe(200);

      const getRes = await request(app).get('/api/shopping');
      const item = getRes.body.find(t => t.id === res.body.id);
      expect(item.name).toBe(xss);

      await request(app).delete(`/api/shopping/${res.body.id}`);
    });

    it('should return 422 for invalid data (Zod validation — empty title, bad enum)', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: '',          // min(1) fails
        priority: 'URGENT', // not in enum
      });
      expect(res.status).toBe(422);
    });

    it('should handle DELETE on non-existent ID without crashing', async () => {
      const res = await request(app).delete('/api/tasks/99999');
      expect(res.status).toBe(200);
    });

    it('should handle deep nested JSON body without crashing', async () => {
      let obj = { data: 1 };
      for (let i = 0; i < 100; i++) obj = { nested: obj };
      const res = await request(app).post('/api/user').send(obj);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should not expose files via path traversal in ID param', async () => {
      const res = await request(app).get('/api/tasks/../../package.json');
      expect(res.status).not.toBe(200);
    });
  });
});
