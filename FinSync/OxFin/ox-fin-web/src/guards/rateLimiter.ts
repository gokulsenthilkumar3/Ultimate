// src/middleware/rateLimiter.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Redis from 'ioredis';

const redis = new Redis(process.env.OXFIN_REDIS_URL);

// Token bucket: 60 requests per minute per IP
const LIMIT = 60;
const WINDOW_MS = 60_000;

export async function rateLimiter(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const key = `rl:${ip}`;
    const now = Date.now();
    const ttl = await redis.pttl(key);
    let count = await redis.get(key);
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
    await redis.incr(key);
    return NextResponse.next();
}
