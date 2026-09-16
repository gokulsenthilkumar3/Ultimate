'use client';

import React, { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

export function useToastManager() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).slice(2);
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(t => t.filter(x => x.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
}

const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
};

export default function ToastManager({ toasts, onRemove }: { toasts: { id: string; message: string; type: ToastType }[]; onRemove: (id: string) => void; }) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    <span style={{ fontWeight: 700, flexShrink: 0 }}>{icons[t.type]}</span>
                    <span className="toast-text">{t.message}</span>
                    <button className="toast-close" onClick={() => onRemove(t.id)}>×</button>
                </div>
            ))}
        </div>
    );
}
