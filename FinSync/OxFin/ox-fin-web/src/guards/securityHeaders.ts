// src/middleware/securityHeaders.ts
import { NextResponse } from 'next/server';

/**
 * Basic security headers middleware.
 * Sets Content Security Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
 */
export function securityHeaders(req: Request): NextResponse | void {
    const res = NextResponse.next();
    // Content Security Policy (adjust as needed for your assets)
    res.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self';"
    );
    // Strict Transport Security (6 months)
    res.headers.set('Strict-Transport-Security', 'max-age=15768000; includeSubDomains; preload');
    // Clickjacking protection
    res.headers.set('X-Frame-Options', 'DENY');
    // MIME sniffing protection
    res.headers.set('X-Content-Type-Options', 'nosniff');
    // Referrer policy
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return res;
}
