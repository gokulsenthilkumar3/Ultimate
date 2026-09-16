// src/app/api/wallets/[type]/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { securityHeaders } from '@/middleware/securityHeaders';
import { rateLimiter } from '@/middleware/rateLimiter';
import { csrfProtection } from '@/middleware/csrf';

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

const WalletTypeSchema = z.enum(['full', 'lite']);
const DepositSchema = z.object({ amount: z.number().positive() });
const WithdrawSchema = z.object({ amount: z.number().positive() });

export async function GET(req: Request, { params }: { params: { type: string } }) {
    const sec = securityHeaders(new Request(req) as any);
    if (sec instanceof NextResponse) return sec;
    const rl = await rateLimiter(new Request(req) as any);
    if (rl instanceof NextResponse) return rl;

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    const typeParse = WalletTypeSchema.safeParse(params.type);
    if (!typeParse.success) {
        return NextResponse.json({ error: 'Invalid wallet type' }, { status: 400 });
    }
    const mock = {
        full: { balance: 28450.0, interestRate: 6.5, dailyLimit: null },
        lite: { balance: 245.8, interestRate: 0, dailyLimit: 65.0 },
    }[typeParse.data];
    return NextResponse.json({ type: params.type, ...mock });
}

export async function POST(req: Request, { params }: { params: { type: string } }) {
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
    const typeParse = WalletTypeSchema.safeParse(params.type);
    if (!typeParse.success) {
        return NextResponse.json({ error: 'Invalid wallet type' }, { status: 400 });
    }
    const body = await req.json();
    const action = body.action;
    if (action === 'deposit') {
        const result = DepositSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: result.error.errors }, { status: 400 });
        return NextResponse.json({ message: 'Deposit successful', amount: result.data.amount });
    }
    if (action === 'withdraw') {
        const result = WithdrawSchema.safeParse(body);
        if (!result.success) return NextResponse.json({ error: result.error.errors }, { status: 400 });
        return NextResponse.json({ message: 'Withdrawal successful', amount: result.data.amount });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
