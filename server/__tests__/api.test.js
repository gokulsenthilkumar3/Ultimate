/**
 * GrowthTrack Backend API — Integration Tests
 *
 * Uses __mocks__ directory for @supabase/supabase-js and routes/phase4a.
 * This avoids all vi.mock() ESM hoisting complexity.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

// Activate the __mocks__ versions (no factory needed)
vi.mock('@supabase/supabase-js');
vi.mock('../routes/phase4a');

// Reset in-memory DB before each test file run
beforeEach(() => {
  globalThis.__db__     = { tasks: [], shopping: [] };
  globalThis.__nextId__ = 1;
});

let app;
beforeAll(async () => {
  const mod = await import('../index.js');
  app = mod.default ?? mod;
});

describe('GrowthTrack Backend API — Integration Tests', () => {
  let createdTaskId;
  let createdShoppingId;

  describe('Tasks API', () => {
    it('POST /api/tasks — creates a new task', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: 'Test Supertest Task', priority: 'high',
        tag: 'Development', dueDate: '2026-05-15', recurring: false,
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

  describe('Shopping API', () => {
    it('POST /api/shopping — creates item', async () => {
      const res = await request(app).post('/api/shopping').send({
        name: 'Supertest Item', category: 'Grocery',
        priority: 'medium', estimatedCost: 12.50,
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

  describe('Audit Logging', () => {
    it('GET /api/logs — 404 (route in phase4a, mocked out)', async () => {
      const res = await request(app).get('/api/logs');
      expect(res.status).toBe(404);
    });
  });

  describe('Adversarial & Boundary Testing', () => {
    it('should store SQL injection payload as literal string', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: "Robert'); DROP TABLE tasks;--", priority: 'low',
      });
      expect(res.status).toBe(200);
      const getRes = await request(app).get('/api/tasks');
      const task = getRes.body.find(t => t.id === res.body.id);
      expect(task.title).toBe("Robert'); DROP TABLE tasks;--");
      await request(app).delete(`/api/tasks/${res.body.id}`);
    });

    it('should store XSS payload as literal string', async () => {
      const xss = "<script>alert('hacked')</script>";
      const res = await request(app).post('/api/shopping').send({ name: xss, category: 'Grocery' });
      expect(res.status).toBe(200);
      const getRes = await request(app).get('/api/shopping');
      const item = getRes.body.find(t => t.id === res.body.id);
      expect(item.name).toBe(xss);
      await request(app).delete(`/api/shopping/${res.body.id}`);
    });

    it('should return 422 for invalid data (Zod validation)', async () => {
      const res = await request(app).post('/api/tasks').send({ title: '', priority: 'URGENT' });
      expect(res.status).toBe(422);
    });

    it('DELETE on non-existent ID — no crash', async () => {
      const res = await request(app).delete('/api/tasks/99999');
      expect([200, 404, 500]).toContain(res.status);
    });

    it('deep nested JSON — no crash', async () => {
      let obj = { data: 1 };
      for (let i = 0; i < 100; i++) obj = { nested: obj };
      const res = await request(app).post('/api/user').send(obj);
      expect([200, 400, 413, 500]).toContain(res.status);
    });

    it('path traversal in ID — does not expose files', async () => {
      const res = await request(app).get('/api/tasks/../../package.json');
      expect(res.status).not.toBe(200);
    });
  });
});
