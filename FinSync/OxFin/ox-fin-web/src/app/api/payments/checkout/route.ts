// src/app/api/payments/checkout/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { securityHeaders } from '@/guards/securityHeaders';
import { rateLimiter } from '@/guards/rateLimiter';
import { csrfProtection } from '@/guards/csrf';
import { PaymentFactory } from '@/lib/payments/PaymentFactory';

const CheckoutSchema = z.object({
    amount: z.number().positive(),
    currency: z.string().min(1),
    metadata: z.object({}).optional(),
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
    // Simple rate limit (reuse generic map if desired)
    // For brevity, we skip additional IP limit here.

    try {
        const body = await req.json();
        const parseResult = CheckoutSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid checkout data', issues: parseResult.error.issues }, { status: 400 });
        }
        const { amount, currency, metadata } = parseResult.data;
        const provider = PaymentFactory.getProvider();
        const result = await provider.initiatePayment(amount, currency, metadata);
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        console.error('Checkout API error:', error);
        return NextResponse.json({ error: 'Internal server error during checkout' }, { status: 500 });
    }
}
