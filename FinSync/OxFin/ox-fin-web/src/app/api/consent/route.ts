// src/app/api/consent/route.ts
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

const ConsentSchema = z.object({
    sms: z.boolean().optional(),
    email: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
});

let userConsents = { sms: false, email: false, whatsapp: false };

export async function GET() {
    const sec = securityHeaders(new Request('') as any);
    if (sec instanceof NextResponse) return sec;
    const rl = await rateLimiter(new Request('') as any);
    if (rl instanceof NextResponse) return rl;

    const ip = '';
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    return NextResponse.json(userConsents);
}

export async function POST(req: Request) {
    const sec = securityHeaders(new Request(req) as any);
    if (sec instanceof NextResponse) return sec;
    const rl = await rateLimiter(new Request(req) as any);
    if (rl instanceof NextResponse) return rl;
    const csrf = await csrfProtection(new Request(req) as any);
    if (csrf instanceof NextResponse) return csrf;

    const ip = '';
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    const body = await req.json();
    const result = ConsentSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }
    userConsents = { ...userConsents, ...result.data };
    return NextResponse.json({ message: 'Consents updated', consents: userConsents });
}
