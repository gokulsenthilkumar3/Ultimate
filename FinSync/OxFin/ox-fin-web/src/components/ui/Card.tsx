'use client';

import { cn } from '@/lib/utils';
import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'elevated';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
}

export function Card({
    className,
    variant = 'default',
    padding = 'md',
    hover = false,
    children,
    ...props
}: CardProps) {
    const baseStyles = 'rounded-xl transition-all duration-300';

    const variants = {
        default: 'bg-surface border border-ox-blue-800',
        glass: 'glass',
        elevated: 'bg-surface-elevated border border-ox-blue-700 shadow-xl shadow-black/20',
    };

    const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    const hoverStyles = hover ? 'hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10 cursor-pointer' : '';

    return (
        <div
            className={cn(baseStyles, variants[variant], paddings[padding], hoverStyles, className)}
            {...props}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={cn('mb-4', className)}>
            {children}
        </div>
    );
}

interface CardTitleProps {
    children: ReactNode;
    className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
    return (
        <h3 className={cn('text-xl font-semibold text-foreground', className)}>
            {children}
        </h3>
    );
}

interface CardDescriptionProps {
    children: ReactNode;
    className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
    return (
        <p className={cn('text-sm text-foreground-muted', className)}>
            {children}
        </p>
    );
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
    return (
        <div className={cn(className)}>
            {children}
        </div>
    );
}
