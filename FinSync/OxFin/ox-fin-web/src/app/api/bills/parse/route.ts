// src/app/api/bills/parse/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { securityHeaders } from '@/guards/securityHeaders';
import { rateLimiter } from '@/guards/rateLimiter';
import { csrfProtection } from '@/guards/csrf';
import { parseBillText } from '@/lib/billParser';

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

const ParseSchema = z.object({
    source: z.enum(['sms', 'email', 'whatsapp']),
    rawText: z.string().min(1),
});

export async function POST(req: Request) {
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
    const parseResult = ParseSchema.safeParse(body);
    if (!parseResult.success) {
        return NextResponse.json({ error: parseResult.error.errors }, { status: 400 });
    }
    const { rawText, source } = parseResult.data;
    try {
        const parsed = parseBillText(rawText);
        return NextResponse.json({ source, parsed });
    } catch (e) {
        return NextResponse.json({ error: 'Parsing failed', details: (e as Error).message }, { status: 500 });
    }
}
