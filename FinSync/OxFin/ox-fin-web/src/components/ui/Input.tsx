'use client';

import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, icon, type = 'text', ...props }, ref) => {
        const [isFocused, setIsFocused] = useState(false);
        const hasValue = props.value || props.defaultValue;

        return (
            <div className="w-full">
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        type={type}
                        className={cn(
                            'w-full rounded-lg bg-surface border transition-all duration-200 text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                            error ? 'border-error' : 'border-ox-blue-700 hover:border-ox-blue-600',
                            icon ? 'pl-10 pr-4 py-3' : 'px-4 py-3',
                            label && 'pt-6 pb-2',
                            className
                        )}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        {...props}
                    />
                    {label && (
                        <label
                            className={cn(
                                'absolute left-4 transition-all duration-200 pointer-events-none',
                                icon ? 'left-10' : '',
                                isFocused || hasValue
                                    ? 'top-1.5 text-xs text-primary'
                                    : 'top-1/2 -translate-y-1/2 text-sm text-foreground-muted'
                            )}
                        >
                            {label}
                        </label>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-sm text-error">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
