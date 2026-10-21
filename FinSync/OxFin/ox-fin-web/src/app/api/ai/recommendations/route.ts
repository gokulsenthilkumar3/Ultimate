// src/app/api/ai/recommendations/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { securityHeaders } from '@/guards/securityHeaders';
import { rateLimiter } from '@/guards/rateLimiter';
import { csrfProtection } from '@/guards/csrf';

const rateLimitMap = new Map<string, { count: number; reset: number }>();
function checkRateLimit(ip: string) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.reset) {
        rateLimitMap.set(ip, { count: 1, reset: now + 60_000 });
        return true;
    }
    if (entry.count >= 60) return false;
    entry.count++;
    return true;
}

export async function GET(req: Request) {
    const sec = securityHeaders(new Request(req) as any);
    if (sec instanceof NextResponse) return sec;
    const rl = await rateLimiter(new Request(req) as any);
    if (rl instanceof NextResponse) return rl;
    const csrf = await csrfProtection(new Request(req) as any);
    if (csrf instanceof NextResponse) return csrf;

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Recommendations must come from a connected provider/model; do not invent financial advice.
    return NextResponse.json({ recommendations: [] });
}
