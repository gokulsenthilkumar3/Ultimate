'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
    size?: 'sm' | 'md';
    className?: string;
}

export default function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';

    const variants = {
        default: 'bg-ox-blue-800 text-foreground',
        success: 'bg-success/20 text-success border border-success/30',
        warning: 'bg-warning/20 text-warning border border-warning/30',
        error: 'bg-error/20 text-error border border-error/30',
        primary: 'bg-primary/20 text-primary border border-primary/30',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
    };

    return (
        <span className={cn(baseStyles, variants[variant], sizes[size], className)}>
            {children}
        </span>
    );
}
