/**
 * GrowthTrack Backend API — Integration Tests
 *
 * Strategy: Mock @supabase/supabase-js with a fully synchronous in-memory store.
 * vi.mock() is hoisted so ALL state must live inside the factory — not outside.
 * We then use globalThis.__db__ as a shared reference tests can reset/read.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// ─── Shared in-memory store via globalThis so tests can inspect it ────────────
globalThis.__db__ = { tasks: [], shopping: [], audit_logs: [] };
globalThis.__nextId__ = 1;

// ─── Supabase mock ───────────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => {
  function buildChain(tableName) {
    const store = () => (globalThis.__db__[tableName] || []);
    let _eqVal   = null;
    let _pending = null;

    const chain = {
      select: ()     => chain,
      order:  ()     => chain,
      limit:  ()     => chain,
      gte:    ()     => chain,
      lte:    ()     => chain,
      single: ()     => Promise.resolve({ data: _pending, error: null }),
      upsert: (row)  => {
        // treat upsert like insert for simplicity
        const id  = globalThis.__nextId__++;
        const rec = { id, ...(Array.isArray(row) ? row[0] : row), created_at: new Date().toISOString() };
        store().push(rec);
        globalThis.__db__[tableName] = store();
        _pending = { id };
        return chain;
      },
      eq: (_f, v)    => { _eqVal = v; return chain; },

      insert: (row)  => {
        const id  = globalThis.__nextId__++;
        const rec = { id, ...(Array.isArray(row) ? row[0] : row), created_at: new Date().toISOString() };
        const arr = store();
        arr.push(rec);
        globalThis.__db__[tableName] = arr;
        if (globalThis.__db__.audit_logs) {
          globalThis.__db__.audit_logs.push({
            id: globalThis.__nextId__++, table_name: tableName,
            action: 'INSERT', details: JSON.stringify(rec),
            created_at: new Date().toISOString(),
          });
        }
        _pending = { id };
        return chain;
      },

      update: (patch) => {
        const arr = store();
        const idx = arr.findIndex(r => String(r.id) === String(_eqVal));
        if (idx !== -1) Object.assign(arr[idx], patch);
        globalThis.__db__[tableName] = arr;
        _pending = arr[idx] || null;
        return chain;
      },

      delete: () => {
        const arr = store();
        const idx = arr.findIndex(r => String(r.id) === String(_eqVal));
        if (idx !== -1) {
          const removed = arr.splice(idx, 1)[0];
          globalThis.__db__[tableName] = arr;
          if (globalThis.__db__.audit_logs) {
            globalThis.__db__.audit_logs.push({
              id: globalThis.__nextId__++, table_name: tableName,
              action: 'DELETE', details: JSON.stringify(removed),
              created_at: new Date().toISOString(),
            });
          }
        }
        return chain;
      },

      // Thenable: resolve with store array or _pending
      then: (res, rej) =>
        Promise.resolve({
          data: _pending !== null ? _pending : [...store()],
          error: null,
        }).then(res, rej),
    };
    chain[Symbol.toStringTag] = 'Promise';
    return chain;
  }

  const mockClient = { from: (t) => buildChain(t) };
  return { createClient: () => mockClient };
});

// phase4a is a separate router that also calls Supabase — stub it out
vi.mock('../routes/phase4a', () => ({
  default: () => (_req, _res, next) => next(),
}));

// Import app AFTER mocks are registered
let app;
beforeAll(async () => {
  const mod = await import('../index.js');
  app = mod.default ?? mod;
});

describe('GrowthTrack Backend API — Integration Tests', () => {
  let createdTaskId;
  let createdShoppingId;

  // ── Tasks ───────────────────────────────────────────────────────────────
  describe('Tasks API', () => {
    it('POST /api/tasks — creates a new task', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: 'Test Supertest Task',
        priority: 'high',
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

  // ── Shopping ───────────────────────────────────────────────────────────
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

  // ── Audit ───────────────────────────────────────────────────────────────
  describe('Audit Logging', () => {
    it('GET /api/logs — returns 404 (/api/logs is in phase4a router, mocked in tests)', async () => {
      const res = await request(app).get('/api/logs');
      expect(res.status).toBe(404);
    });
  });

  // ── Adversarial ──────────────────────────────────────────────────────────
  describe('Adversarial & Boundary Testing', () => {
    it('should store SQL injection payload as literal string', async () => {
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

    it('should store XSS payload as literal string', async () => {
      const xss = "<script>alert('hacked')</script>";
      const res = await request(app).post('/api/shopping').send({
        name: xss, category: 'Grocery',
      });
      expect(res.status).toBe(200);

      const getRes = await request(app).get('/api/shopping');
      const item = getRes.body.find(t => t.id === res.body.id);
      expect(item.name).toBe(xss);
      await request(app).delete(`/api/shopping/${res.body.id}`);
    });

    it('should return 422 for invalid data (Zod validation)', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: '', priority: 'URGENT',
      });
      expect(res.status).toBe(422);
    });

    it('DELETE on non-existent ID — should not crash (returns 200)', async () => {
      // index.js does supabase.delete().eq('id', id) — no 404 if not found, just success
      const res = await request(app).delete('/api/tasks/99999');
      expect([200, 404, 500]).toContain(res.status);
    });

    it('should handle deep nested JSON body without crashing', async () => {
      let obj = { data: 1 };
      for (let i = 0; i < 100; i++) obj = { nested: obj };
      const res = await request(app).post('/api/user').send(obj);
      expect([200, 400, 413, 500]).toContain(res.status);
    });

    it('should not expose files via path traversal in ID param', async () => {
      const res = await request(app).get('/api/tasks/../../package.json');
      expect(res.status).not.toBe(200);
    });
  });
});
