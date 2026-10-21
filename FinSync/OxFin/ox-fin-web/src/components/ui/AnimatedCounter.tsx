'use client';

import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

interface AnimatedCounterProps {
    end: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
}

export default function AnimatedCounter({
    end,
    duration = 2000,
    prefix = '',
    suffix = '',
    decimals = 0,
    className = ''
}: AnimatedCounterProps) {
    const countRef = useRef<HTMLSpanElement>(null);
    const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

    useEffect(() => {
        if (!inView || !countRef.current) return;

        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (end - startValue) * easeOutQuart;

            if (countRef.current) {
                countRef.current.textContent = `${prefix}${currentValue.toFixed(decimals)}${suffix}`;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }, [inView, end, duration, prefix, suffix, decimals]);

    return (
        <span ref={ref} className={className}>
            <span ref={countRef}>{prefix}0{suffix}</span>
        </span>
    );
}
