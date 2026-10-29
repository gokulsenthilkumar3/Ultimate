// @vitest-environment node
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgentsRouter } from '../../server/agents/router.js';
import { createAgentAdmission } from '../../server/agents/admission.js';
import { boundedChunks, readBoundedJson } from '../../server/agents/transport.js';
import { groqRecords } from '../../server/agents/groq.js';
import { AGENT_LIMITS } from '../../src/lib/agentPolicy.js';

const servers = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); })));
});
const input = { model: 'gemma3:1b', messages: [{ role: 'user', content: 'Draft a task.' }] };
async function start(options) {
  const app = express();
  // This fixture header is never used by production authentication.
  app.use((req, _res, next) => { req.user = { id: req.get('X-Fixture-Owner') || 'owner' }; next(); });
  app.use('/api/agents', createAgentsRouter({ provider: 'ollama', ollamaBaseUrl: 'http://fixture.invalid:11434', ...options }));
  const server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  servers.push(server);
  return (path = '/chat', owner = 'owner', body = input) => fetch(`http://127.0.0.1:${server.address().port}/api/agents${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Fixture-Owner': owner }, body: JSON.stringify(body),
  });
}

describe('bounded agent admission', () => {
  it('shares an account budget across chats and plans, resets by window, and bounds owner storage', () => {
    let time = 0;
    const gate = createAgentAdmission({ now: () => time, limits: { generationsPerWindow: 2, owners: 2, activeGenerations: 2 } });
    const release = gate.acquire('a', 'generation');
    expect(() => gate.acquire('a', 'generation')).toThrow('already running');
    release(); release(); // Idempotent release cannot increase capacity.
    gate.acquire('a', 'generation')();
    expect(() => gate.acquire('a', 'generation')).toThrow('request limit');
    gate.acquire('b', 'discovery')();
    expect(() => gate.acquire('c', 'discovery')).toThrow('busy');
    time = 60_000;
    expect(() => gate.acquire('c', 'generation')()).not.toThrow();
    expect(() => gate.acquire('a', 'generation')()).not.toThrow();
  });

  it('enforces account and global concurrency before provider calls and releases on disconnect', async () => {
    const feeds = [], cancels = [];
    const fetchImpl = vi.fn(async url => {
      if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: input.model }] });
      const cancel = vi.fn(); cancels.push(cancel);
      return new Response(new ReadableStream({ start(controller) { feeds.push(controller); }, cancel }));
    });
    const post = await start({ fetchImpl, limits: { activeGenerations: 2 } });
    const first = await post();
    const overlapping = await post('/plan', 'owner', { ...input, today: '2026-10-29' });
    expect(overlapping.status).toBe(429);
    expect(overlapping.headers.get('Retry-After')).toBe('1');
    expect(fetchImpl.mock.calls.filter(([url]) => url.endsWith('/api/chat'))).toHaveLength(1);
    const second = await post('/chat', 'second-owner');
    expect(second.status).toBe(200);
    expect((await post('/chat', 'third-owner')).status).toBe(429);
    await first.body.cancel();
    await vi.waitFor(() => expect(cancels[0]).toHaveBeenCalledOnce());
    const next = await post();
    expect(next.status).toBe(200);
    for (const index of [1, 2]) {
      feeds[index].enqueue(new TextEncoder().encode(JSON.stringify({ message: { content: 'Finished' }, done: true }) + '\n'));
      feeds[index].close();
    }
    await Promise.all([second.text(), next.text()]);
  });

  it('returns a retry delay without contacting the provider after the generation budget is spent', async () => {
    const fetchImpl = vi.fn(async url => url.endsWith('/api/tags') ? Response.json({ models: [{ name: input.model }] }) : Response.json({ message: { content: 'Answer' }, done: true }));
    const post = await start({ fetchImpl, limits: { generationsPerWindow: 1 } });
    await (await post()).text();
    const response = await post('/plan', 'owner', { ...input, today: '2026-10-29' });
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('untrusted provider resource boundaries', () => {
  it('does not disclose coded transport errors from a response body', async () => {
    const fetchImpl = vi.fn(async url => {
      if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: input.model }] });
      return new Response(new ReadableStream({ start(controller) {
        controller.error(Object.assign(new Error('Private hostname and provider credentials'), { code: 'ECONNRESET', status: 418 }));
      } }));
    });
    const post = await start({ fetchImpl });
    for (const [path, body] of [['/chat', input], ['/plan', { ...input, today: '2026-10-29' }]]) {
      const text = await (await post(path, 'owner', body)).text();
      expect(text).not.toMatch(/Private hostname|credentials|ECONNRESET/);
      expect(text).toContain(path === '/chat' ? 'invalid_stream' : 'invalid_plan');
    }
  });

  it('bounds actual UTF-8 bytes rather than decoded characters', async () => {
    await expect(readBoundedJson(Response.json({ text: '界'.repeat(100_000) }), new AbortController().signal)).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('cancels pending reads even when the upstream cancel promise never resolves', async () => {
    const cancel = vi.fn(() => new Promise(() => {}));
    const body = new ReadableStream({ cancel });
    const controller = new AbortController();
    const consume = async () => { for await (const _chunk of boundedChunks(body, controller.signal)) { /* no chunks expected */ } };
    const pending = consume();
    const stopped = expect(pending).rejects.toThrow('Stopped');
    controller.abort(new Error('Stopped'));
    await stopped;
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });

  it('bounds Groq frames even if every frame contains ignored usage metadata', async () => {
    const text = 'data: {"choices":[]}\n\n'.repeat(AGENT_LIMITS.streamRecords + 1);
    const consume = async () => { for await (const _record of groqRecords(new Response(text).body, new AbortController().signal)) { /* no text */ } };
    await expect(consume()).rejects.toMatchObject({ code: 'invalid_stream' });
  });

  it.each([
    ['too many Ollama records', '{}\n'.repeat(AGENT_LIMITS.streamRecords + 1)],
    ['too many raw bytes', ' '.repeat(AGENT_LIMITS.streamBytes + 1)],
    ['oversized decoded output', JSON.stringify({ message: { content: 'x'.repeat(AGENT_LIMITS.responseChars + 1) }, done: true })],
    ['a truncated completion', JSON.stringify({ message: { content: 'Partial' }, done: true, done_reason: 'length' })],
    ['an unsolicited tool call', JSON.stringify({ message: { content: 'Run this', tool_calls: [{ function: { name: 'shell' } }] }, done: true })],
  ])('rejects %s without reporting completion', async (_label, output) => {
    const post = await start({ fetchImpl: vi.fn(async url => url.endsWith('/api/tags') ? Response.json({ models: [{ name: input.model }] }) : new Response(output)) });
    const text = await (await post()).text();
    expect(text).toContain('event: error');
    expect(text).not.toContain('event: done');
  });
});
