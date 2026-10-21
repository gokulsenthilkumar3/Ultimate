import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy Convention
 * This resolves the stability issues and fulfills the new middleware requirements.
 */
export async function proxy(req: NextRequest, event: any) {
    return (withAuth as any)(req, event);
}

// Ensure compatibility with the default export requirement
export default proxy;

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/wallets/:path*",
        "/settings/:path*",
        "/bills/:path*",
        "/cards/:path*",
        "/investments/:path*"
    ],
};
