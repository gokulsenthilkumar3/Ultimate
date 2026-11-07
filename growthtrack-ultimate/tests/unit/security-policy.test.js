// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest';
import { chromium } from '@playwright/test';
import express from 'express';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { contentSecurityPolicy } from '../../server/contentSecurityPolicy.js';
import { loadServerConfig } from '../../server/config.js';

let browser, server, base;
beforeAll(async () => {
  const config = loadServerConfig({ NODE_ENV: 'production', HANDOFF_SECRET: 'b'.repeat(64) });
  const app = express(); app.use(express.json());
  const trusted = `<button id="injected-handler" onclick="window.handlerRan = true">Untrusted handler</button><script>
    window.trustedRan = true;
    try { eval('window.evalRan = true'); } catch { window.evalBlocked = true; }
    fetch('https://blocked.invalid/leak').catch(() => { window.connectionBlocked = true; });
  </script>`;
  app.get('/', (_req, res) => res.set('Content-Security-Policy', contentSecurityPolicy(config, trusted)).type('html').send(trusted + '<script>window.injectedRan = true;</script>'));
  const explorer = await readFile(new URL('../../api-explorer.html', import.meta.url), 'utf8');
  app.get('/explorer', (_req, res) => res.set('Content-Security-Policy', contentSecurityPolicy(config, explorer)).type('html').send(explorer));
  app.get('/api/auth/csrf', (req, res) => req.headers.cookie?.includes('fixture_session=yes') ? res.json({ csrfToken: 'fixture-csrf' }) : res.sendStatus(401));
  app.post('/api/auth/login', (req, res) => {
    if (req.body.password !== 'fictional-password') return res.sendStatus(401);
    res.cookie('fixture_session', 'yes', { httpOnly: true, sameSite: 'strict' });
    res.json({ user: { id: 'fixture-owner' }, csrfToken: 'fixture-csrf' });
  });
  app.post('/api/habits', (req, res) => res.status(req.headers.cookie?.includes('fixture_session=yes') && req.headers['x-csrf-token'] === 'fixture-csrf' ? 200 : 403).json({ fixtureSaved: true }));
  app.post('/api/auth/logout', (_req, res) => { res.clearCookie('fixture_session'); res.json({ success: true }); });
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, channel: process.env.GROWTHTRACK_TEST_BROWSER_CHANNEL || undefined });
}, 20000);
afterAll(async () => { await browser?.close(); if (server) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }); });

it('executes trusted hashed scripts while blocking injected code, handlers, eval and unlisted connections', async () => {
  const page = await browser.newPage(); let leakedRequests = 0;
  await page.route('https://blocked.invalid/**', route => { leakedRequests += 1; return route.fulfill({ body: '{}' }); });
  try {
    await page.goto(base);
    await page.locator('#injected-handler').click();
    await expect.poll(() => page.evaluate(() => window.connectionBlocked)).toBe(true);
    expect(await page.evaluate(() => ({ trusted: window.trustedRan, evalBlocked: window.evalBlocked, injected: Boolean(window.injectedRan), handler: Boolean(window.handlerRan), evaluated: Boolean(window.evalRan) }))).toEqual({ trusted: true, evalBlocked: true, injected: false, handler: false, evaluated: false });
    expect(leakedRequests).toBe(0);
  } finally { await page.close(); }
});

it('uses real explorer controls under CSP to log in and send a cookie/CSRF mutation', async () => {
  const context = await browser.newContext(); const page = await context.newPage();
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '' }));
  page.on('dialog', dialog => dialog.accept());
  try {
    await page.goto(base + '/explorer');
    await page.getByRole('button', { name: 'Quick Auth Helper' }).click();
    await page.getByTitle('Login Email', { exact: true }).fill('owner@example.test');
    await page.getByTitle('Login Password', { exact: true }).fill('fictional-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect.poll(() => page.locator('#auth-label').textContent()).toBe('Owner session active');
    await page.locator('#search-input').fill('Create Habit');
    await page.locator('.endpoint-item').click();
    await page.getByRole('button', { name: /Send \(Ctrl\+Enter\)/ }).click();
    await expect.poll(() => page.locator('#resp-status').textContent()).toContain('200');
    await expect.poll(() => page.locator('#response-viewer').textContent()).toContain('fixtureSaved');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect.poll(() => page.locator('#auth-label').textContent()).toBe('Unauthenticated');
  } finally { await context.close(); }
});
