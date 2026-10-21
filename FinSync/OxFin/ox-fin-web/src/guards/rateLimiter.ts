// src/middleware/rateLimiter.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Redis from 'ioredis';

const redisUrl = process.env.OXFIN_REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;
const memory = new Map<string, { count: number; reset: number }>();

// Token bucket: 60 requests per minute per IP
const LIMIT = 60;
const WINDOW_MS = 60_000;

export async function rateLimiter(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const key = `rl:${ip}`;
    const now = Date.now();
    let ttl = 0;
    let count: string | null = null;
    if (redis) {
        try { ttl = await redis.pttl(key); count = await redis.get(key); }
        catch { /* use the bounded in-process fallback */ }
    }
    if (!count) {
        const entry = memory.get(key);
        if (!entry || entry.reset <= now) { memory.set(key, { count: 1, reset: now + WINDOW_MS }); return NextResponse.next(); }
        count = String(entry.count);
        ttl = entry.reset - now;
    }
    if (count === null) {
        await redis.set(key, '1', 'PX', WINDOW_MS);
        return NextResponse.next();
    }
    const current = parseInt(count, 10);
    if (current >= LIMIT) {
        const retryAfter = ttl > 0 ? Math.ceil(ttl / 1000) : 60;
        const resp = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        resp.headers.set('Retry-After', retryAfter.toString());
        return resp;
    }
    if (redis) { try { await redis.incr(key); } catch { /* fallback below */ } }
    const entry = memory.get(key);
    if (entry && entry.reset > now) entry.count += 1;
    return NextResponse.next();
}
