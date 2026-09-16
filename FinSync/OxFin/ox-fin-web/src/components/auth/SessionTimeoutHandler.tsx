'use client';

import { useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export default function SessionTimeoutHandler() {
    const { data: session } = useSession();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (session) {
            timeoutRef.current = setTimeout(() => {
                signOut({ callbackUrl: '/', redirect: true });
            }, IDLE_TIMEOUT);
        }
    };

    useEffect(() => {
        if (!session) return;

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, resetTimeout);
        });

        resetTimeout();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetTimeout);
            });
        };
    }, [session]);

    return null; // This component doesn't render anything
}
