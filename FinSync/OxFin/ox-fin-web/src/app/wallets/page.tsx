'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    Wallet, Lock, Unlock, TrendingUp, Info, Zap,
    ArrowUpRight, ArrowDownRight, Loader2, RefreshCw,
} from 'lucide-react';
import PhysicalCard from '@/components/ui/PhysicalCard';
import OxCryptoConverter from '@/components/ui/OxCryptoConverter';
import { calculateDailyInterest, calculateWalletLiteLimit, formatUSD } from '@/lib/oxCrypto';

/* ─── Progress bar ───────────────────────────────────────────── */
function ProgressBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="progress-track">
            <div className={`progress-fill ${colorClass}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

/* ─── Stat Row ───────────────────────────────────────────────── */
function StatRow({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
            <span className="text-sm text-white/50">{label}</span>
            <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
        </div>
    );
}

export default function WalletsPage() {
    const { data: session } = useSession();
    const [pinFreeEnabled, setPinFreeEnabled] = useState(false);
    const [walletLiteLimit, setWalletLiteLimit] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [wallets, setWallets] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [balanceRes, txRes, limit] = await Promise.all([
                fetch('/api/user/balance'),
                fetch('/api/user/transactions'),
                calculateWalletLiteLimit(),
            ]);
            if (balanceRes.ok && txRes.ok) {
                const balanceData = await balanceRes.json();
                const txData = await txRes.json();
                setWallets(balanceData.wallets || []);
                setTransactions(txData.transactions || []);
            }
            setWalletLiteLimit(limit);
        } catch (err) {
            console.error('Wallet fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (session) fetchData(); }, [session]);

    const oxFullWallet = wallets.find(w => w.type === 'full');
    const oxLiteWallet = wallets.find(w => w.type === 'lite');
    const fullBalance = parseFloat(oxFullWallet?.balance || '0');
    const liteBalance = parseFloat(oxLiteWallet?.balance || '0');
    const totalBalance = fullBalance + liteBalance;
    const dailyInterest = oxFullWallet ? calculateDailyInterest(fullBalance) : 0;

    /* group transactions by date */
    const grouped: Record<string, typeof transactions> = {};
    transactions.forEach(txn => {
        const d = new Date(txn.created_at);
        const now = new Date();
        const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
        const key = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        (grouped[key] ||= []).push(txn);
    });

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-24 relative z-10">
            {/* Ambient */}
            <div className="fixed top-[5%] right-[10%] w-[40%] h-[40%] bg-emerald-600/6 rounded-full blur-[130px] animate-orb pointer-events-none -z-10" />

            {/* ── Header ── */}
            <header className="flex items-center justify-between animate-slide-up">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Wallets</h1>
                    <p className="text-sm text-white/40 mt-1">Manage your Ox Wallet & Wallet Lite</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Hero Balance */}
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Balance</p>
                        {loading
                            ? <div className="h-7 w-32 skeleton mt-1" />
                            : <p className="text-2xl font-bold text-white animate-count-up">{formatUSD(totalBalance)}</p>
                        }
                    </div>
                    <button onClick={fetchData} className="glass-button-secondary p-2.5 rounded-xl"><RefreshCw size={16} /></button>
                </div>
            </header>

            {/* ── Wallet Cards ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* OX Full */}
                <div className="space-y-4 animate-slide-up-delay-1">
                    {loading ? (
                        <div className="card-swiss h-[200px] flex items-center justify-center">
                            <Loader2 className="w-7 h-7 text-white/30 animate-spin" />
                        </div>
                    ) : (
                        <PhysicalCard balance={fullBalance} cardHolder={session?.user?.name?.toUpperCase() || 'AGENT'} expiry="12/29" variant="primary" />
                    )}

                    <div className="card-swiss p-5">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/25 flex items-center justify-center">
                                <Wallet size={16} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Ox Wallet (Full)</h3>
                                <span className="badge badge-emerald">KYC Verified</span>
                            </div>
                            <span className="ml-auto badge badge-blue">6.5% APY</span>
                        </div>
                        <StatRow label="Daily Interest Earned" value={formatUSD(dailyInterest)} valueClass="text-emerald-400" />
                        <StatRow label="Monthly Projection" value={formatUSD(dailyInterest * 30)} />
                        <StatRow label="Transactions" value="Unlimited" />
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-white/40 mb-1.5">
                                <span>Balance utilization</span>
                                <span>42%</span>
                            </div>
                            <ProgressBar value={42} max={100} colorClass="bg-gradient-to-r from-blue-500 to-indigo-500" />
                        </div>
                        <p className="text-[11px] text-white/30 flex items-start gap-1.5 mt-3.5">
                            <Info size={12} className="mt-0.5 shrink-0" />
                            Earns 6.5% of regional Repo Rate. Unlimited transactions with full KYC.
                        </p>
                    </div>
                </div>

                {/* Wallet Lite */}
                <div className="space-y-4 animate-slide-up-delay-2">
                    {loading ? (
                        <div className="card-swiss h-[200px] flex items-center justify-center">
                            <Loader2 className="w-7 h-7 text-white/30 animate-spin" />
                        </div>
                    ) : (
                        <PhysicalCard balance={liteBalance} cardHolder={session?.user?.name?.toUpperCase() || 'AGENT'} expiry="12/29" variant="dark" />
                    )}

                    <div className="card-swiss p-5">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/25 flex items-center justify-center">
                                <Zap size={16} className="text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Wallet Lite</h3>
                                <span className="badge badge-amber">Gold-Pegged Limit</span>
                            </div>
                            <button onClick={() => setPinFreeEnabled(!pinFreeEnabled)}
                                className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors">
                                {pinFreeEnabled ? <Unlock size={14} className="text-emerald-400" /> : <Lock size={14} />}
                                {pinFreeEnabled ? 'PIN-Free ON' : 'PIN-Free OFF'}
                            </button>
                        </div>
                        <StatRow label="Daily Limit (Gold-Pegged)" value={loading ? '…' : formatUSD(walletLiteLimit)} />
                        <StatRow label="Today's Spending" value={formatUSD(0)} />
                        <StatRow label="PIN-Free Payments" value={pinFreeEnabled ? 'Enabled' : 'Disabled'} valueClass={pinFreeEnabled ? 'text-emerald-400' : 'text-white/40'} />
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-white/40 mb-1.5">
                                <span>Today's usage</span>
                                <span>0 / {formatUSD(walletLiteLimit)}</span>
                            </div>
                            <ProgressBar value={0} max={walletLiteLimit} colorClass="bg-gradient-to-r from-amber-500 to-orange-500" />
                        </div>
                        <p className="text-[11px] text-white/30 flex items-start gap-1.5 mt-3.5">
                            <Info size={12} className="mt-0.5 shrink-0" />
                            Daily limit equals current 1g gold price. Limited KYC required.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Ox Crypto ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OxCryptoConverter />

                <div className="card-swiss p-6 bg-gradient-to-br from-[#F59E0B]/80 via-[#D97706]/80 to-[#B45309]/80 border-none relative overflow-hidden group">
                    <div className="absolute inset-0 noise-texture opacity-10 pointer-events-none mix-blend-overlay" />
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="relative z-10 flex items-center justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black text-amber-100/60 uppercase tracking-[0.2em] mb-1">Ox Crypto Assets</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl text-amber-200 font-black">ரூ</span>
                                <h2 className="text-xl font-extrabold tracking-tight text-white">Not connected</h2>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-amber-100/80 font-medium mt-2">
                                <TrendingUp size={14} />
                                <span>Connect a crypto provider to see your balance</span>
                            </div>
                        </div>
                        <div className="w-20 h-20 rounded-full bg-white/12 backdrop-blur-xl flex items-center justify-center text-3xl border border-white/20 shadow-2xl group-hover:scale-110 transition-transform duration-500 shrink-0">
                            <span className="text-amber-100">ரூ</span>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/15 relative z-10">
                        <p className="text-[10px] text-amber-100/50 uppercase font-black tracking-widest">
                            High-Yield Protocol Active · +1.2% Bonus Today
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Recent Transactions ── */}
            <div className="card-swiss p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
                </div>
                {loading ? (
                    <div className="space-y-3">
                        {Array(4).fill(0).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 py-2">
                                <div className="w-10 h-10 rounded-xl skeleton" />
                                <div className="flex-1 space-y-2"><div className="h-3 w-36 skeleton" /><div className="h-2 w-20 skeleton" /></div>
                                <div className="h-3 w-16 skeleton" />
                            </div>
                        ))}
                    </div>
                ) : Object.keys(grouped).length === 0 ? (
                    <p className="text-sm text-white/30 text-center py-8">No transactions found.</p>
                ) : (
                    Object.entries(grouped).map(([date, txns]) => (
                        <div key={date} className="mb-5">
                            <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-2 px-1">{date}</p>
                            {txns.map((txn: any) => {
                                const isIncome = parseFloat(txn.amount) > 0;
                                return (
                                    <div key={txn.id} className="list-row group cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${isIncome ? 'bg-emerald-500/15' : 'bg-white/8'}`}>
                                                {isIncome
                                                    ? <ArrowDownRight size={18} className="text-emerald-400" />
                                                    : <ArrowUpRight size={18} className="text-white/50" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{txn.description}</p>
                                                <p className="text-[11px] text-white/35">{new Date(txn.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-semibold ${isIncome ? 'text-emerald-400' : 'text-white/80'}`}>
                                            {isIncome ? '+' : ''}{formatUSD(Math.abs(parseFloat(txn.amount)))}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
