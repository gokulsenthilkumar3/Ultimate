'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ArrowRightLeft,
    Wallet,
    Zap,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    wallets: any[];
}

export default function TransferModal({ isOpen, onClose, onSuccess, wallets }: TransferModalProps) {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [fromWalletId, setFromWalletId] = useState('');
    const [toWalletId, setToWalletId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen && wallets.length >= 2) {
            setFromWalletId(wallets[0].id.toString());
            setToWalletId(wallets[1].id.toString());
        }
    }, [isOpen, wallets]);

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (fromWalletId === toWalletId) {
            setError('Source and destination wallets must be different');
            setLoading(false);
            return;
        }

        const sourceWallet = wallets.find(w => w.id.toString() === fromWalletId);
        if (sourceWallet && parseFloat(amount) > parseFloat(sourceWallet.balance)) {
            setError('Insufficient funds in source wallet');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/user/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromWalletId: parseInt(fromWalletId),
                    toWalletId: parseInt(toWalletId),
                    amount: parseFloat(amount),
                    description: description || 'Internal Transfer'
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Transfer failed');
            } else {
                setStep('success');
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            setError('An unexpected error occurred');
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
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
                {step === 'form' ? (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <ArrowRightLeft size={20} />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">New Transfer</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleTransfer} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">From Wallet</label>
                                    <select
                                        value={fromWalletId}
                                        onChange={(e) => setFromWalletId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-slate-50 text-sm font-medium"
                                    >
                                        {wallets.map(w => (
                                            <option key={w.id} value={w.id}>
                                                {w.type === 'full' ? 'Ox Wallet' : 'Wallet Lite'} (${parseFloat(w.balance).toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">To Wallet</label>
                                    <select
                                        value={toWalletId}
                                        onChange={(e) => setToWalletId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-slate-50 text-sm font-medium"
                                    >
                                        {wallets.map(w => (
                                            <option key={w.id} value={w.id}>
                                                {w.type === 'full' ? 'Ox Wallet' : 'Wallet Lite'} (${parseFloat(w.balance).toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/10 text-3xl font-bold text-slate-900 placeholder:text-slate-200 bg-slate-50/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Description (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. For dinner"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-slate-50 text-sm"
                                />
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 text-lg shadow-xl shadow-blue-500/20"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Confirm Transfer'}
                                </Button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="p-12 text-center space-y-6">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"
                        >
                            <CheckCircle2 size={40} />
                        </motion.div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-slate-900">Transfer Successful!</h2>
                            <p className="text-slate-500">Your funds have been moved between wallets.</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center text-sm font-medium">
                            <span className="text-slate-500">Amount Transferred</span>
                            <span className="text-slate-900 font-bold text-lg">${parseFloat(amount).toFixed(2)}</span>
                        </div>
                        <Button variant="primary" onClick={onClose} className="w-full py-4">
                            Done
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
