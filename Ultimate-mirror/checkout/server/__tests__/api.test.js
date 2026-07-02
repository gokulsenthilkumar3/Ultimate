
const request = require('supertest');
const app = require('../index'); // Require the express app

describe('GrowthTrack Backend API - Integration Tests', () => {
  let createdTaskId;
  let createdShoppingId;

  // ---------------------------------------------------------
  // Tasks API Tests
  // ---------------------------------------------------------
  describe('Tasks API', () => {
    it('POST /api/tasks should create a new task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Supertest Task',
          priority: 'High',
          tag: 'Development',
          dueDate: '2026-05-15',
          recurring: false
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      createdTaskId = response.body.id;
    });

    it('GET /api/tasks should return an array containing the new task', async () => {
      const response = await request(app).get('/api/tasks');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const task = response.body.find(t => t.id === createdTaskId);
      expect(task).toBeDefined();
      expect(task.title).toBe('Test Supertest Task');
      expect(task.priority).toBe('High');
      expect(task.done).toBe(false);
    });

    it('PUT /api/tasks/:id should update the task completion status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${createdTaskId}`)
        .send({
          done: true,
          completedAt: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const getResponse = await request(app).get('/api/tasks');
      const task = getResponse.body.find(t => t.id === createdTaskId);
      expect(task.done).toBe(true);
    });

    it('DELETE /api/tasks/:id should remove the task', async () => {
      const response = await request(app).delete(`/api/tasks/${createdTaskId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const getResponse = await request(app).get('/api/tasks');
      const task = getResponse.body.find(t => t.id === createdTaskId);
      expect(task).toBeUndefined();
    });
  });

  // ---------------------------------------------------------
  // Shopping API Tests
  // ---------------------------------------------------------
  describe('Shopping API', () => {
    it('POST /api/shopping should create a new item', async () => {
      const response = await request(app)
        .post('/api/shopping')
        .send({
          name: 'Supertest Item',
          category: 'Grocery',
          priority: 'Medium',
          estimatedCost: 12.50
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      createdShoppingId = response.body.id;
    });

    it('DELETE /api/shopping/:id should remove the item', async () => {
      const response = await request(app).delete(`/api/shopping/${createdShoppingId}`);
      expect(response.status).toBe(200);
    });
  });

  // ---------------------------------------------------------
  // Audit Log Verification
  // ---------------------------------------------------------
  describe('Audit Logging System', () => {
    it('GET /api/logs should capture the recent POST and DELETE actions', async () => {
      const response = await request(app).get('/api/logs');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Look for the INSERT action in shopping
      const insertLog = response.body.find(log => log.table_name === 'shopping' && log.action === 'INSERT');
      expect(insertLog).toBeDefined();
      expect(insertLog.details).toContain('Supertest Item');

      // Look for the DELETE action in shopping
      const deleteLog = response.body.find(log => log.table_name === 'shopping' && log.action === 'DELETE');
      expect(deleteLog).toBeDefined();
    });
  });
  // ---------------------------------------------------------
  // Adversarial & Vulnerability Testing
  // ---------------------------------------------------------
  describe('Adversarial & Boundary Testing', () => {
    it('should safely handle SQL injection attempts without executing or crashing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: "Robert'); DROP TABLE tasks;--",
          priority: "High"
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      
      // Verify it was inserted as literal text, not executed as SQL
      const getResponse = await request(app).get('/api/tasks');
      const maliciousTask = getResponse.body.find(t => t.id === response.body.id);
      expect(maliciousTask.title).toBe("Robert'); DROP TABLE tasks;--");
      
      // Cleanup
      await request(app).delete(`/api/tasks/${response.body.id}`);
    });

    it('should safely store XSS payloads without execution contexts', async () => {
      const xssPayload = "<script>alert('hacked')</script><img src='x' onerror='alert(1)'>";
      const response = await request(app)
        .post('/api/shopping')
        .send({
          name: xssPayload,
          category: 'Grocery'
        });
      
      expect(response.status).toBe(200);
      const getResponse = await request(app).get('/api/shopping');
      const item = getResponse.body.find(t => t.id === response.body.id);
      expect(item.name).toBe(xssPayload); // Should be stored exactly as string, UI must escape it

      // Cleanup
      await request(app).delete(`/api/shopping/${response.body.id}`);
    });

    it('should handle invalid data types gracefully (e.g., boolean where string expected)', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: { nested: 'object' }, // Expected string
          priority: 99999, // Expected string
          recurring: "not-a-boolean" // Expected boolean
        });
      
      // better-sqlite3 throws a TypeError when binding an object, Express catches and returns 500
      expect(response.status).toBe(500); 
    });

    it('should handle overly massive payloads (stressing body parser)', async () => {
      // Create a 5MB string
      const hugeString = 'A'.repeat(5 * 1024 * 1024);
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Massive Payload Task',
          priority: hugeString
        });
      
      expect([200, 413]).toContain(response.status);
      if (response.status === 200) {
        await request(app).delete(`/api/tasks/${response.body.id}`);
      }
    }, 10000);

    // ---------------------------------------------------------
    // Stress & Concurrency Testing
    // ---------------------------------------------------------
    it('should handle rapid-fire concurrent requests without crashing (Race Conditions)', async () => {
      const concurrency = 50; // 50 simultaneous requests
      const promises = [];
      
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          request(app)
            .post('/api/tasks')
            .send({ title: `Spam Task ${i}`, priority: 'Low' })
        );
      }
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;
      
      // We expect the server to stay alive. Some might fail with SQLITE_BUSY if not handled, 
      // but we want to see the resilience.
      console.log(`Concurrency Test: ${successCount}/${concurrency} requests succeeded`);
      expect(successCount).toBeGreaterThan(0);
      
      // Cleanup all created tasks
      const getResponse = await request(app).get('/api/tasks');
      const cleanupPromises = getResponse.body
        .filter(t => t.title.startsWith('Spam Task '))
        .map(t => request(app).delete(`/api/tasks/${t.id}`));
      await Promise.all(cleanupPromises);
    }, 15000);

    // ---------------------------------------------------------
    // Path Traversal / Probing
    // ---------------------------------------------------------
    it('should not allow path traversal in ID parameters', async () => {
      const response = await request(app).get('/api/tasks/../../package.json');
      // Should either be 404, 400, or some other safe error, NOT the contents of package.json
      expect(response.status).not.toBe(200);
    });

    it('should handle extreme numeric values in estimatedCost', async () => {
      const response = await request(app)
        .post('/api/shopping')
        .send({
          name: 'Infinite Cost Item',
          estimatedCost: 1e308 // Near max float
        });
      
      expect(response.status).toBe(200);
      const getResponse = await request(app).get('/api/shopping');
      const item = getResponse.body.find(t => t.id === response.body.id);
      expect(item.estimatedCost).toBeDefined();
      
      await request(app).delete(`/api/shopping/${response.body.id}`);
    });

    it('should handle negative or non-existent IDs gracefully', async () => {
      const response = await request(app).delete('/api/tasks/-999');
      // Should not crash, just return success: true (since DELETE is idempotent) or 404
      expect(response.status).toBe(200);
    });

    it('should handle deep JSON nesting without crashing (JSON Bomb attempt)', async () => {
      // Create a deeply nested object
      let obj = { a: 1 };
      for (let i = 0; i < 500; i++) {
        obj = { b: obj };
      }
      
      const response = await request(app)
        .post('/api/user')
        .send(obj);
      
      // We expect the server to survive. 
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
