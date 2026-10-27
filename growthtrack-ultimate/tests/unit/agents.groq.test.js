// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createAgentsRouter } from '../../server/agents/router.js';
import { DEFAULT_GROQ_MODELS } from '../../server/agents/groq.js';

// Mock sessions and Groq only. No application server, database, or real key.
const servers = [];
const KEY = 'test-key-never-return-to-browser';
const body = extra => ({ model: DEFAULT_GROQ_MODELS[0], messages: [{ role: 'user', content: 'Plan today' }], ...extra });
const models = () => Response.json({ data: DEFAULT_GROQ_MODELS.map(id => ({ id, active: true })) });
const frame = data => `data: ${typeof data === 'string' ? data : JSON.stringify(data)}\r\n\r\n`;
const chunk = (content, finish_reason = null, extra = {}) => ({ choices: [{ index: 0, delta: { content, ...extra }, finish_reason }] });
const sse = (...records) => new Response(records.map(frame).join(''), { headers: { 'Content-Type': 'text/event-stream' } });
const answer = () => sse(chunk('Hello'), chunk(' world', 'stop'), '[DONE]');
const planResponse = (plan, finish_reason = 'stop') => Response.json({ choices: [{ index: 0, finish_reason, message: { content: typeof plan === 'string' ? plan : JSON.stringify(plan) } }] });
const upstream = (generate = answer) => vi.fn(async url => url.endsWith('/models') ? models() : generate());

async function start(options = {}, authenticated = true) {
  const app = express();
  if (authenticated) app.use((req, _res, next) => { req.user = { id: 'fixture-owner' }; next(); });
  app.use('/api/agents', createAgentsRouter({ provider: 'groq', groqApiKey: KEY, groqModels: DEFAULT_GROQ_MODELS, groqDefaultModel: DEFAULT_GROQ_MODELS[0], ...options }));
  const server = await new Promise(resolve => {
    const running = app.listen(0, '127.0.0.1', () => resolve(running));
  });
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}/api/agents`;
  return {
    base, get: () => fetch(`${base}/readiness`),
    post: (data, path = 'chat', options = {}) => fetch(`${base}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), ...options,
    }),
  };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise(resolve => {
    server.closeAllConnections();
    server.close(resolve);
  })));
});

describe('Groq server configuration and boundaries', () => {
  it.each([{ groqApiKey: '' }, { groqModels: [] }, { groqModels: 'https://attacker/model' }, { provider: 'unknown' }])('fails closed for invalid configuration %j', async config => {
    const fetchImpl = upstream();
    const app = await start({ ...config, fetchImpl });
    const response = await app.get();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ configured: false, ready: false, code: 'not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('discovers permitted models and keeps credentials server-side', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ data: [
      ...DEFAULT_GROQ_MODELS.map(id => ({ id, active: true })), { id: DEFAULT_GROQ_MODELS[0] },
      { id: 'unrelated-model' }, { id: 'https://attacker/model' },
    ] }));
    const app = await start({ fetchImpl, groqDefaultModel: DEFAULT_GROQ_MODELS[1] });
    const response = await app.get();
    const status = await response.json();
    expect(status).toMatchObject({ provider: 'groq', configured: true, ready: true, modelCount: 2, defaultModel: DEFAULT_GROQ_MODELS[1] });
    expect(status.models.map(item => item.id)).toEqual([...DEFAULT_GROQ_MODELS].reverse());
    expect(JSON.stringify(status)).not.toContain(KEY);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.groq.com/openai/v1/models', expect.objectContaining({ redirect: 'error', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' } }));
  });

  it('does not report readiness for inactive, absent, or disallowed models', async () => {
    const app = await start({ fetchImpl: vi.fn(async () => Response.json({ data: [{ id: DEFAULT_GROQ_MODELS[0], active: false }, { id: 'other' }] })) });
    expect(await (await app.get()).json()).toMatchObject({ ready: false, models: [], code: 'no_chat_models' });
    const restricted = await start({ fetchImpl: upstream(), allowedModels: ['other'] });
    expect(await (await restricted.get()).json()).toMatchObject({ ready: false, models: [] });
  });

  it.each([
    [401, 503, 'provider_auth_failed'], [403, 503, 'provider_auth_failed'], [429, 429, 'rate_limited'],
    [400, 502, 'provider_request_rejected'], [500, 503, 'upstream_unavailable'],
  ])('redacts upstream HTTP %i errors without retry', async (upstreamStatus, status, code) => {
    const fetchImpl = vi.fn(async () => Response.json({ error: { message: `private detail ${KEY}` } }, { status: upstreamStatus }));
    const app = await start({ fetchImpl });
    const response = await app.get();
    expect(response.status).toBe(status);
    const data = await response.json();
    expect(data).toMatchObject({ ready: false, code });
    expect(JSON.stringify(data)).not.toMatch(/private detail|test-key-never/);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('redacts network errors and malformed model lists', async () => {
    const app = await start({ fetchImpl: vi.fn().mockRejectedValue(new Error(`network failure ${KEY}`)) });
    expect(await (await app.get()).text()).not.toContain(KEY);
    const invalid = await start({ fetchImpl: vi.fn(async () => Response.json({ data: null })) });
    expect((await invalid.get()).status).toBe(502);
  });

  it('requires authentication, same-origin access, consent, and permitted request fields', async () => {
    const fetchImpl = upstream();
    const unauthenticated = await start({ fetchImpl }, false);
    expect((await unauthenticated.get()).status).toBe(401);
    const app = await start({ fetchImpl });
    expect((await fetch(`${app.base}/readiness`, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
    expect((await app.post(body({ apiKey: 'browser-key' }))).status).toBe(400);
    expect((await app.post(body({ context: [{ id: 'm1', type: 'metrics', domain: 'wellness', label: 'Weight', text: 'private' }] }))).status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect((await app.post(body({ model: 'other-model' }))).status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

describe('Groq streaming chat', () => {
  it.each(DEFAULT_GROQ_MODELS)('uses %s with compatible generation settings', async model => {
    const fetchImpl = upstream();
    const app = await start({ fetchImpl });
    const text = await (await app.post(body({ model }))).text();
    expect(text).toContain('event: delta');
    expect(text).toContain('event: done');
    expect(text).toContain('"provider":"groq"');
    expect(text).not.toContain(KEY);
    const [url, options] = fetchImpl.mock.calls[1];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const request = JSON.parse(options.body);
    expect(request).toMatchObject({ model, stream: true, max_completion_tokens: 4096 });
    expect(request.messages.at(-1)).toEqual({ role: 'user', content: 'Plan today' });
    expect(request).not.toHaveProperty('tools');
    expect(request).toMatchObject(model.startsWith('qwen/')
      ? { temperature: 0.6, top_p: 0.95, reasoning_effort: 'default', reasoning_format: 'hidden' }
      : { temperature: 1, top_p: 1, reasoning_effort: 'medium', include_reasoning: false });
  });

  it('streams split UTF-8 before completion and discards separate reasoning', async () => {
    let feed;
    const fetchImpl = upstream(() => new Response(new ReadableStream({ start(controller) { feed = controller; } }), { headers: { 'Content-Type': 'text/event-stream' } }));
    const app = await start({ fetchImpl });
    const response = await app.post(body());
    const reader = response.body.getReader();
    const bytes = new TextEncoder().encode(': keepalive\r\n\r\n' + frame(chunk('வணக்கம்', null, { reasoning: 'private reasoning' })));
    for (const byte of bytes) feed.enqueue(Uint8Array.of(byte));
    let result = '';
    while (!result.includes('event: delta')) result += new TextDecoder().decode((await reader.read()).value);
    expect(result).toContain('வணக்கம்');
    expect(result).not.toMatch(/event: done|private reasoning/);
    feed.enqueue(new TextEncoder().encode(frame(chunk(null, 'stop')) + frame('[DONE]')));
    feed.close();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }
    expect(result).toContain('event: done');
  });

  it.each([
    () => sse(chunk('Partial')), () => sse(chunk('Partial', 'length'), '[DONE]'), () => sse('[DONE]'),
    () => sse(chunk('   ', 'stop'), '[DONE]'), () => sse('not-json'), () => sse({ error: { message: KEY } }),
    () => sse(chunk(null, 'tool_calls', { tool_calls: [{ id: 'unapproved' }] }), '[DONE]'),
    () => sse('x'.repeat(256 * 1024 + 1)),
  ])('reports incomplete or invalid output without successful done', async generate => {
    const app = await start({ fetchImpl: upstream(generate) });
    const text = await (await app.post(body())).text();
    expect(text).toContain('event: error');
    expect(text).not.toMatch(/event: done|test-key-never/);
  });

  it('aborts and cancels stalled bodies at the deadline', async () => {
    const cancelled = vi.fn();
    const fetchImpl = upstream(() => new Response(new ReadableStream({ cancel: cancelled }), { headers: { 'Content-Type': 'text/event-stream' } }));
    const app = await start({ fetchImpl, timeoutMs: 80 });
    const text = await (await app.post(body())).text();
    expect(text).toContain('"code":"timeout"');
    expect(text).not.toContain('event: done');
    expect(fetchImpl.mock.calls[1][1].signal.aborted).toBe(true);
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it('cancels upstream when the browser stops', async () => {
    const cancelled = vi.fn();
    const fetchImpl = upstream(() => new Response(new ReadableStream({ cancel: cancelled }), { headers: { 'Content-Type': 'text/event-stream' } }));
    const app = await start({ fetchImpl });
    const controller = new AbortController();
    const response = await app.post(body(), 'chat', { signal: controller.signal });
    await response.body.getReader().read();
    controller.abort();
    await vi.waitFor(() => expect(cancelled).toHaveBeenCalledOnce());
    expect(fetchImpl.mock.calls[1][1].signal.reason.code).toBe('disconnected');
  });
});

describe('Groq reviewed action plans', () => {
  it.each(DEFAULT_GROQ_MODELS)('validates a plan from %s without executing it', async model => {
    const plan = { summary: 'Review this task.', actions: [{ kind: 'task.create', title: 'Review draft' }] };
    const fetchImpl = upstream(() => planResponse(plan));
    const app = await start({ fetchImpl });
    const response = await app.post(body({ model, today: '2026-10-27' }), 'plan');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...plan, model, requiresReview: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const sent = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(sent).toMatchObject({ stream: false, response_format: { type: 'json_schema', json_schema: { name: 'growthtrack_action_plan', strict: false } } });
    expect(sent.response_format.json_schema.schema.properties.actions).toBeDefined();
    expect(sent).not.toHaveProperty('tools');
  });

  it.each([
    { summary: 'Unsafe', actions: [{ kind: 'task.complete', recordId: 'unselected' }] },
    { summary: 'Unsafe', actions: [{ kind: 'shell.execute', command: 'something' }] },
    { summary: 'Invalid', actions: [{ kind: 'task.create', title: '' }] }, 'not-json',
  ])('rejects invalid plans and unselected references %j', async plan => {
    const app = await start({ fetchImpl: upstream(() => planResponse(plan)) });
    const response = await app.post(body({ today: '2026-10-27' }), 'plan');
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: 'invalid_plan' });
  });

  it('rejects truncated plans and cancels stalled JSON bodies', async () => {
    const app = await start({ fetchImpl: upstream(() => planResponse({ summary: 'Partial', actions: [] }, 'length')) });
    expect((await app.post(body({ today: '2026-10-27' }), 'plan')).status).toBe(502);
    const cancelled = vi.fn();
    const stalled = await start({ timeoutMs: 80, fetchImpl: upstream(() => new Response(new ReadableStream({ cancel: cancelled }))) });
    const response = await stalled.post(body({ today: '2026-10-27' }), 'plan');
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ code: 'timeout' });
    expect(cancelled).toHaveBeenCalledOnce();
  });
});
