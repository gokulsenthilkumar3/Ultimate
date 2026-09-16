// src/app/api/investments/order/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { securityHeaders } from '@/guards/securityHeaders';
import { rateLimiter } from '@/guards/rateLimiter';
import { csrfProtection } from '@/guards/csrf';
import { InvestmentFactory } from '@/lib/investments/InvestmentFactory';

const OrderSchema = z.object({
    symbol: z.string().min(1),
    quantity: z.number().positive(),
    side: z.enum(['buy', 'sell']),
    price: z.number().positive().optional(),
});

export async function POST(req: Request) {
    // Security middleware
    const sec = securityHeaders(new Request(req) as any);
    if (sec instanceof NextResponse) return sec;
    const rl = await rateLimiter(new Request(req) as any);
    if (rl instanceof NextResponse) return rl;
    const csrf = await csrfProtection(new Request(req) as any);
    if (csrf instanceof NextResponse) return csrf;

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    // Rate limiting could be added here if desired.

    try {
        const body = await req.json();
        const parseResult = OrderSchema.safeParse(body); // Keep OrderSchema for this file
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid order data', issues: parseResult.error.issues }, { status: 400 });
        }
        const { symbol, quantity, side, price } = parseResult.data; // Keep original destructuring
        const provider = InvestmentFactory.getProvider(); // Keep InvestmentFactory
        const result = await provider.placeOrder(symbol, quantity, side, price); // Keep placeOrder
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        console.error('Order API error:', error); // Keep Order API error
        return NextResponse.json({ error: 'Internal server error during order placement' }, { status: 500 }); // Keep original error message
    }
}
