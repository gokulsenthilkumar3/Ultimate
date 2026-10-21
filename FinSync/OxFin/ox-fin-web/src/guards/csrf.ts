// src/middleware/csrf.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple double‑submit cookie CSRF protection
export async function csrfProtection(request: NextRequest) {
    if (request.method === 'GET' || request.method === 'HEAD') {
        // For safe methods, set a CSRF token cookie if not present
        const existing = request.cookies.get('csrfToken');
        if (!existing) {
            const token = crypto.randomUUID();
            const response = NextResponse.next();
            response.cookies.set('csrfToken', token, { httpOnly: true, sameSite: 'strict', path: '/' });
            return response;
        }
        return NextResponse.next();
    }

    // For state‑changing methods, verify token
    const tokenFromCookie = request.cookies.get('csrfToken')?.value;
    const tokenFromHeader = request.headers.get('x-csrf-token');
    if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
        return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    return NextResponse.next();
}
