import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { registerFinanceRoutes } from '../../server/domains/finance';

describe('release safety contracts', () => {
  it('keeps the Electron renderer isolated from Node', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'desktop.js'), 'utf8');
    expect(source).toMatch(/nodeIntegration:\s*false/);
    expect(source).toMatch(/contextIsolation:\s*true/);
    expect(source).toMatch(/sandbox:\s*true/);
  });

  it('never writes generated transactions from the bank-sync placeholder', () => {
    const routes = [];
    const app = { get: () => {}, post: (path, ...handlers) => routes.push({ path, handler: handlers.at(-1) }) };
    registerFinanceRoutes(app, () => {}, { prisma: new Proxy({}, { get: () => { throw new Error('No database access permitted'); } }) });
    const route = routes.find(item => item.path === '/api/finance/sync/bank');
    expect(route).toBeTruthy();
    let status, payload;
    route.handler({}, { status: value => { status = value; return { json: value => { payload = value; } }; } });
    expect(status).toBe(501);
    expect(payload.code).toBe('CONNECTOR_SETUP_REQUIRED');
  });
});
