'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

enum ErrorType {
    Configuration = 'Configuration',
    AccessDenied = 'AccessDenied',
    Verification = 'Verification',
    Default = 'Default',
}

const errorMap = {
    [ErrorType.Configuration]: {
        title: 'Configuration Error',
        message: 'There is a problem with the server configuration. Please check the console if you are the administrator.',
    },
    [ErrorType.AccessDenied]: {
        title: 'Access Denied',
        message: 'You have permission to view this page.',
    },
    [ErrorType.Verification]: {
        title: 'Verification Failed',
        message: 'The verification link was invalid or has expired. Please try requesting a new one.',
    },
    [ErrorType.Default]: {
        title: 'Authentication Error',
        message: 'An unexpected error occurred during authentication. Please try again.',
    },
};

export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error') as ErrorType || ErrorType.Default;

    const { title, message } = errorMap[error] || errorMap[ErrorType.Default];

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full bg-surface border border-border p-8 rounded-2xl shadow-xl shadow-blue-500/10 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-3">{title}</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    {message}
                </p>

                <div className="space-y-3">
                    <Link href="/">
                        <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25">
                            Try Again
                        </button>
                    </Link>
                    <Link href="/">
                        <button className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                            <ArrowLeft size={18} />
                            Back to Home
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
