// src/app/api/oxcrypto/convert/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { securityHeaders } from '@/guards/securityHeaders';
import { rateLimiter } from '@/guards/rateLimiter';
import { csrfProtection } from '@/guards/csrf';

// Simple in‑memory rate limiter (per IP, 60 req/min)
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

const ConvertSchema = z.object({
    amountUsd: z.number().positive('Amount must be positive'),
});

export async function POST(req: Request) {
    // Apply security middleware
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
    const body = await req.json();
    const parseResult = ConvertSchema.safeParse(body);
    if (!parseResult.success) {
        return NextResponse.json({ error: parseResult.error.errors }, { status: 400 });
    }
    const { amountUsd } = parseResult.data;
    const OX_CRYPTO_RATE = 0.011; // 1 ரூ = $0.011 USD (example)
    const BUY_FEE_PERCENT = 1; // 1% fee
    const fee = (amountUsd * BUY_FEE_PERCENT) / 100;
    const totalUsd = amountUsd + fee;
    const ox = amountUsd / OX_CRYPTO_RATE;
    return NextResponse.json({ ox, fee, totalUsd });
}
