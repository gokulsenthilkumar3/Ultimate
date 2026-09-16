'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft, ArrowDownRight, ArrowUpRight, DownloadCloud,
    Loader2, Search, TrendingUp, TrendingDown,
} from 'lucide-react';
import { formatDate, formatMoney, regionalDefaults, type RegionalPreferences } from '@/lib/regional';

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'income' | 'spending'>('all');
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState<RegionalPreferences>(regionalDefaults);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('oxfin-regional-preferences');
            if (saved) setPreferences({ ...regionalDefaults, ...JSON.parse(saved) });
        } catch { }
        fetch('/api/user/transactions')
            .then(r => r.json())
            .then(d => setTransactions(d.transactions || []))
            .finally(() => setLoading(false));
    }, []);

    const visible = useMemo(() => transactions.filter(txn => {
        const matchSearch = `${txn.description} ${txn.type}`.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || (filter === 'income' ? Number(txn.amount) > 0 : Number(txn.amount) < 0);
        return matchSearch && matchFilter;
    }), [transactions, search, filter]);

    /* Stats */
    const totalIn = transactions.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = transactions.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const net = totalIn - totalOut;

    /* Group by date */
    const grouped = useMemo(() => {
        const g: Record<string, typeof visible> = {};
        visible.forEach(txn => {
            const d = new Date(txn.created_at);
            const now = new Date();
            const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
            const key = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            (g[key] ||= []).push(txn);
        });
        return g;
    }, [visible]);

    const exportCSV = () => {
        const csv = [['Date', 'Description', 'Type', 'Amount'], ...visible.map(t => [
            formatDate(t.created_at, preferences), t.description, t.type, t.amount
        ])].map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = 'oxfin-activity.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 pb-24 relative z-10">
            {/* Ambient */}
            <div className="fixed top-[5%] right-[10%] w-[40%] h-[40%] bg-blue-600/6 rounded-full blur-[140px] animate-orb pointer-events-none -z-10" />

            {/* ── Header ── */}
            <header className="space-y-2 animate-slide-up">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/70 transition-colors mb-2">
                    <ArrowLeft size={15} /> Back to Overview
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Activity</h1>
                        <p className="text-sm text-white/40 mt-1">A clear record of money moving in and out</p>
                    </div>
                    <button onClick={exportCSV} className="glass-button-secondary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
                        <DownloadCloud size={16} /> Export CSV
                    </button>
                </div>
            </header>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-3 gap-3 animate-slide-up-delay-1">
                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                            <TrendingUp size={13} className="text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total In</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-400">{formatMoney(totalIn, preferences)}</p>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                            <TrendingDown size={13} className="text-red-400" />
                        </div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Out</p>
                    </div>
                    <p className="text-lg font-bold text-red-400">{formatMoney(totalOut, preferences)}</p>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${net >= 0 ? 'bg-blue-500/15 border border-blue-500/25' : 'bg-amber-500/15 border border-amber-500/25'}`}>
                            {net >= 0 ? <TrendingUp size={13} className="text-blue-400" /> : <TrendingDown size={13} className="text-amber-400" />}
                        </div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Net</p>
                    </div>
                    <p className={`text-lg font-bold ${net >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                        {net >= 0 ? '+' : ''}{formatMoney(Math.abs(net), preferences)}
                    </p>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="section-card p-4 space-y-3 animate-slide-up-delay-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by merchant or type…"
                        aria-label="Search activity"
                        className="glass-input w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                    />
                </div>
                <div className="flex gap-2" role="tablist" aria-label="Activity filters">
                    {(['all', 'income', 'spending'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${filter === f ? 'bg-white/12 text-white' : 'text-white/35 hover:text-white/60 bg-white/[0.03]'}`}>
                            {f}
                        </button>
                    ))}
                    <span className="ml-auto text-xs text-white/25 self-center">
                        {visible.length} {visible.length === 1 ? 'result' : 'results'}
                    </span>
                </div>
            </div>

            {/* ── Transaction List ── */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-white/30 w-7 h-7" /></div>
            ) : visible.length === 0 ? (
                <div className="text-center py-16 text-white/30 text-sm">
                    {search ? 'No activity matches your search.' : 'No transactions yet.'}
                </div>
            ) : (
                <div className="space-y-6 animate-slide-up-delay-3">
                    {Object.entries(grouped).map(([date, txns]) => (
                        <div key={date}>
                            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest px-1 mb-2">{date}</p>
                            <div className="section-card divide-y divide-white/[0.04]">
                                {txns.map(txn => {
                                    const income = Number(txn.amount) > 0;
                                    return (
                                        <div key={txn.id} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-white/[0.025] transition-colors group cursor-pointer">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${income ? 'bg-emerald-500/12 text-emerald-300 border border-emerald-500/20' : 'bg-white/[0.06] text-white/50 border border-white/[0.08]'}`}>
                                                    {income ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{txn.description}</p>
                                                    <p className="text-[11px] text-white/35 mt-0.5">
                                                        {new Date(txn.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {txn.type}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className={`text-sm font-bold whitespace-nowrap ${income ? 'text-emerald-400' : 'text-white/70'}`}>
                                                {income ? '+' : '-'}{formatMoney(Math.abs(Number(txn.amount)), preferences)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
