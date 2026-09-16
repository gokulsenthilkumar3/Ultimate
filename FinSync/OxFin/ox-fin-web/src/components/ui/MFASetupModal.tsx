'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, CheckCircle2, AlertCircle, Loader2, Copy, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import Button from './Button';

interface MFASetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
    const [step, setStep] = useState<'intro' | 'qr' | 'verify' | 'success'>('intro');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [setupData, setSetupData] = useState<{ secret: string; otpauth: string } | null>(null);
    const [code, setCode] = useState('');

    const startSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/user/mfa/setup', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to start setup');
            setSetupData(data);
            setStep('qr');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/user/mfa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: setupData?.secret, code })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid code');
            setStep('success');
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-primary">
                                <Shield size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Configure MFA</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 'intro' && (
                            <motion.div
                                key="intro"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">1</div>
                                        <p className="text-sm text-slate-600 leading-relaxed">Install an authenticator app like Google Authenticator or Authy on your phone.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">2</div>
                                        <p className="text-sm text-slate-600 leading-relaxed">Scan the QR code we provide to link your OxFin account.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">3</div>
                                        <p className="text-sm text-slate-600 leading-relaxed">Enter the 6-digit code from the app to confirm your identity.</p>
                                    </div>
                                </div>
                                <Button onClick={startSetup} loading={loading} className="w-full py-3">
                                    Get Started
                                </Button>
                            </motion.div>
                        )}

                        {step === 'qr' && (
                            <motion.div
                                key="qr"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 text-center"
                            >
                                <div className="bg-slate-50 p-6 rounded-2xl inline-block mx-auto border border-slate-100 shadow-inner">
                                    {setupData && <QRCodeSVG value={setupData.otpauth} size={180} />}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-900">Scan this QR Code</p>
                                    <p className="text-xs text-slate-500 px-4">Open your authenticator app and use the camera to scan this code.</p>
                                </div>
                                <div className="pt-2">
                                    <Button onClick={() => setStep('verify')} className="w-full py-3">
                                        I've Scanned It
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'verify' && (
                            <motion.div
                                key="verify"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <form onSubmit={verifyCode} className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-slate-700 block text-center">Enter 6-digit code</label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000 000"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                            className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-slate-50"
                                            autoFocus
                                        />
                                    </div>
                                    <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full py-3">
                                        Verify & Enable
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => setStep('qr')}
                                        className="w-full text-xs text-slate-400 hover:text-primary transition-colors font-medium"
                                    >
                                        Back to QR Code
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-8 text-center space-y-6"
                            >
                                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-slate-900">MFA Enabled</h3>
                                    <p className="text-sm text-slate-500">Your account is now protected with Two-Factor Authentication.</p>
                                </div>
                                <Button onClick={onClose} className="w-full py-3">
                                    Done
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
