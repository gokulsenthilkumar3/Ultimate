import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadableStream } from 'node:stream/web';
import { TextEncoder, TextDecoder } from 'node:util';
import { getAgentsReadiness, streamAgentsChat } from '../../src/services/aiClient';
import { buildSelectedAiContext, getAiContextCandidates } from '../../src/lib/aiContext';
import { setCsrfToken } from '../../src/lib/apiClient';
import { AGENT_LIMITS } from '../../src/lib/agentPolicy';

const frame = (event, data) => `event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`;
const stream = text => new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });
const request = extra => ({ model: 'gemma3:1b', messages: [{ role: 'user', content: 'Plan today' }], ...extra });
beforeEach(() => {
  vi.stubGlobal('TextEncoder', TextEncoder);
  vi.stubGlobal('TextDecoder', TextDecoder);
  sessionStorage.clear();
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('same-origin Agents client', () => {
  it.each([
    frame('delta', { text: 'x'.repeat(AGENT_LIMITS.responseChars + 1) }),
    ': ignored\n\n'.repeat(AGENT_LIMITS.streamRecords + 1),
    ' '.repeat(AGENT_LIMITS.streamBytes + 1),
  ])('rejects oversized text, frames, and raw bytes without releasing output', async text => {
    vi.stubGlobal('fetch', vi.fn(async () => stream(text)));
    const onDelta = vi.fn();
    await expect(streamAgentsChat(request({ onDelta }))).rejects.toThrow('stream limit');
    expect(onDelta).not.toHaveBeenCalled();
  });

  it('stops parsing buffered frames immediately when a callback aborts the request', async () => {
    const controller = new AbortController(), onDelta = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => stream(frame('meta', { model: 'gemma3:1b' }) + frame('delta', { text: 'Must not arrive after abort' }) + frame('done', { done: true }))));
    await expect(streamAgentsChat(request({ signal: controller.signal, onMeta: () => controller.abort(), onDelta }))).rejects.toMatchObject({ name: 'AbortError' });
    expect(onDelta).not.toHaveBeenCalled();
  });

  it('reports the provider selected by the authenticated backend', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stream(frame('meta', { model: 'openai/gpt-oss-120b', provider: 'groq' }) + frame('delta', { text: 'Ready' }) + frame('done', { done: true }))));
    expect(await streamAgentsChat(request({ model: 'openai/gpt-oss-120b' }))).toMatchObject({ provider: 'groq', model: 'openai/gpt-oss-120b', text: 'Ready', done: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty('apiKey');
  });

  it('requires actual models even when a response claims readiness', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ready: true, models: [] })));
    expect(await getAgentsReadiness()).toMatchObject({ ready: false, available: false });
    expect(fetch).toHaveBeenCalledWith('/api/agents/readiness', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store', redirect: 'error' }));
  });

  it('delivers split UTF-8 SSE deltas before EOF and sends CSRF without retry', async () => {
    setCsrfToken('csrf-test');
    let feed;
    const body = new ReadableStream({ start(controller) { feed = controller; } });
    const fetchImpl = vi.fn(async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }));
    vi.stubGlobal('fetch', fetchImpl);
    const onDelta = vi.fn();
    const pending = streamAgentsChat(request({ onDelta }));
    const bytes = new TextEncoder().encode(frame('meta', { model: 'gemma3:1b' }) + frame('delta', { text: 'வணக்கம்' }));
    for (const byte of bytes) feed.enqueue(Uint8Array.of(byte));
    await vi.waitFor(() => expect(onDelta).toHaveBeenCalledWith('வணக்கம்'));
    feed.enqueue(new TextEncoder().encode(frame('delta', { text: '!' }) + frame('done', { done: true })));
    feed.close();
    expect(await pending).toMatchObject({ text: 'வணக்கம்!', done: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/agents/chat');
    expect(options.headers.get('X-CSRF-Token')).toBe('csrf-test');
    expect(options.credentials).toBe('same-origin');
    expect(JSON.parse(options.body)).toMatchObject({ context: [], consent: {} });
  });

  it.each([
    frame('delta', { text: 'Partial' }),
    'event: delta\ndata: not-json\n\n',
    frame('done', { done: true }),
    frame('error', { code: 'timeout', error: 'Model timed out.' }),
  ])('rejects malformed/empty/interrupted streams %s', async text => {
    vi.stubGlobal('fetch', vi.fn(async () => stream(text)));
    await expect(streamAgentsChat(request())).rejects.toThrow();
  });

  it('cancels an in-flight reader and stops callbacks after abort', async () => {
    const cancelled = vi.fn();
    let feed;
    const body = new ReadableStream({ start(controller) { feed = controller; }, cancel: cancelled });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })));
    const controller = new AbortController();
    const onDelta = vi.fn();
    const promise = streamAgentsChat(request({ signal: controller.signal, onDelta }));
    feed.enqueue(new TextEncoder().encode(frame('delta', { text: 'First' })));
    await vi.waitFor(() => expect(onDelta).toHaveBeenCalledOnce());
    const rejected = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    expect(cancelled).toHaveBeenCalledOnce();
    expect(onDelta).toHaveBeenCalledOnce();
  });

  it('does not send already aborted requests and reports expired authentication', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn(async () => Response.json({}, { status: 401 }));
    vi.stubGlobal('fetch', fetchImpl);
    await expect(streamAgentsChat(request({ signal: controller.signal }))).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).not.toHaveBeenCalled();
    const expired = vi.fn();
    window.addEventListener('growthtrack:auth-expired', expired, { once: true });
    await expect(streamAgentsChat(request())).rejects.toThrow('Sign in again');
    expect(expired).toHaveBeenCalledOnce();
  });
});

const state = () => ({
  user: { id: 'owner', email: 'private@example.com', tasks: { pending: [{ id: 't1', title: 'Review draft', userId: 'owner', secret: 'not projected' }], completed: [{ id: 't2', title: 'Done', user_id: 'owner' }] } },
  tasks: [{ id: 'wrong', title: 'Wrong legacy selector' }],
  metric_logs: [{ id: 'm1', userId: 'owner', metric: 'weight', value: 72, unit: 'kg' }, { id: 'other', userId: 'another-owner', metric: 'weight', value: 88 }],
  finance: { transactions: { f1: { id: 'f1', userId: 'owner', amount: 12, type: 'Expense' } } },
  notes: [{ id: 'j1', userId: 'owner', source: 'mind-journal', content: 'Private journal' }],
});

describe('explicit selected context and ownership', () => {
  it('starts empty, uses user.tasks, and excludes sensitive categories by default', () => {
    const snapshot = state();
    expect(buildSelectedAiContext(snapshot)).toEqual([]);
    expect(getAiContextCandidates(snapshot).map(record => record.key)).toEqual(['tasks:t1', 'tasks:t2']);
    const selected = buildSelectedAiContext(snapshot, ['tasks:t1', 'metrics:m1', 'transactions:f1', 'journal:j1']);
    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({ id: 't1', type: 'tasks' });
    expect(JSON.stringify(selected)).not.toMatch(/email|secret|Private journal|Wrong legacy/);
  });

  it('gates each sensitive domain separately and uses metric/unit fields from metric_logs', () => {
    const selected = buildSelectedAiContext(state(), ['metrics:m1', 'metrics:other', 'transactions:f1', 'journal:j1'], { wellness: true });
    expect(selected).toHaveLength(1);
    expect(JSON.parse(selected[0].text)).toMatchObject({ metric: 'weight', value: 72, unit: 'kg' });
    const all = buildSelectedAiContext(state(), ['metrics:m1', 'transactions:f1', 'journal:j1'], { wellness: true, finance: true, journal: true });
    expect(all).toHaveLength(3);
    expect(buildSelectedAiContext(state(), ['metrics:m1'], { wellness: false })).toEqual([]);
  });

  it('excludes wrong/missing owners, stale session state and failed loads', () => {
    const snapshot = state();
    snapshot.metric_logs.push({ id: 'no-owner', metric: 'weight', value: 90 });
    snapshot.user.tasks.pending.push({ id: 'wrong-owner', user_id: 'different', title: 'Private' });
    expect(getAiContextCandidates(snapshot, { wellness: true }).map(record => record.id)).toEqual(['t1', 't2', 'm1']);
    expect(getAiContextCandidates({ ...snapshot, user: null }, { wellness: true })).toEqual([]);
    expect(getAiContextCandidates({ ...snapshot, isLoading: true })).toEqual([]);
    expect(getAiContextCandidates({ ...snapshot, initialLoadError: new Error('failed') })).toEqual([]);
  });
});
