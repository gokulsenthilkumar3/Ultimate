"use client";

import { SessionProvider } from "next-auth/react";
import SessionTimeoutHandler from "@/components/auth/SessionTimeoutHandler";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <SessionTimeoutHandler />
            {children}
        </SessionProvider>
    );
}
