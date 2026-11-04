import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Redis from 'ioredis';

const redisUrl = process.env.OXFIN_REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;
const memory = new Map<string, { count: number; reset: number }>();
const LIMIT = 60, WINDOW_MS = 60_000;
const script = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return {n, redis.call('PTTL', KEYS[1])}`;

export async function rateLimiter(request: NextRequest) {
    // Ingress must overwrite this header before proxy trust is enabled.
    const forwarded = process.env.OXFIN_TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for') : null;
    const ip = forwarded && forwarded.length <= 64 && !forwarded.includes(',') ? forwarded : 'unknown';
    const key = `rl:${ip}`, now = Date.now();
    let count: number | undefined, ttl = WINDOW_MS;
    if (redis) {
        try {
            const result = await redis.eval(script, 1, key, WINDOW_MS) as [number, number];
            count = Number(result[0]); ttl = Number(result[1]);
        } catch { /* bounded process-local fallback */ }
    }
    if (count === undefined) {
        if (memory.size >= 10000) {
            for (const [tracked, value] of memory) if (value.reset <= now) memory.delete(tracked);
            if (!memory.has(key) && memory.size >= 10000) return NextResponse.json({ error: 'Server busy' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
        }
        let entry = memory.get(key);
        if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + WINDOW_MS }; memory.set(key, entry); }
        count = ++entry.count; ttl = entry.reset - now;
    }
    if (count > LIMIT) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil(ttl / 1000))), 'Cache-Control': 'no-store' } });
    return NextResponse.next();
}
