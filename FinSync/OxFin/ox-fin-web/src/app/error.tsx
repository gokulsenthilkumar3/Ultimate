'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service in production
        console.error("UI Error Boundary Caught:", error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center z-50">
            <div className="card-swiss p-10 max-w-lg w-full flex flex-col items-center border-red-500/30 bg-red-950/10 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                    <AlertTriangle size={32} className="text-red-400" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-3">Something went wrong</h2>
                
                <p className="text-sm text-white/60 mb-6 leading-relaxed">
                    An unexpected error occurred in the application. We've logged this issue, but you can try recovering the state.
                </p>

                <div className="w-full bg-black/40 border border-red-500/20 rounded-xl p-4 mb-8 text-left overflow-x-auto">
                    <p className="text-xs text-red-400 font-mono">
                        {error.message || "Unknown Application Error"}
                    </p>
                    {error.digest && (
                        <p className="text-[10px] text-white/40 mt-2 font-mono">Digest ID: {error.digest}</p>
                    )}
                </div>

                <button
                    onClick={() => reset()}
                    className="glass-button w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold tracking-wide"
                >
                    <RefreshCcw size={18} />
                    Try Again
                </button>
            </div>
        </div>
    );
}
