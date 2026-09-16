'use client';

import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center rounded-2xl font-bold transition-shadow focus:outline-none focus:ring-4 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            primary: 'bg-primary text-white shadow-xl shadow-primary/20 focus:ring-primary/20',
            secondary: 'bg-white text-slate-700 border-2 border-slate-100 shadow-sm hover:border-slate-200 focus:ring-slate-100',
            ghost: 'hover:bg-slate-50 text-slate-500 hover:text-slate-900 focus:ring-slate-100',
            danger: 'bg-error text-white shadow-xl shadow-error/20 focus:ring-error/20',
            success: 'bg-success text-white shadow-xl shadow-success/20 focus:ring-success/20',
        };

        const sizes = {
            sm: 'px-4 py-2 text-xs',
            md: 'px-6 py-3 text-sm',
            lg: 'px-8 py-4 text-base',
        };

        return (
            <motion.button
                ref={ref as any}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cn(baseStyles, variants[variant], sizes[size], isLoading && 'cursor-wait', className)}
                disabled={disabled || isLoading}
                {...(props as any)}
            >
                {isLoading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                ) : null}
                {children}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
