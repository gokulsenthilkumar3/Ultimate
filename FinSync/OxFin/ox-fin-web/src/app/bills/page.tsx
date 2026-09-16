'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, FileText, Loader2, Plus, ReceiptText } from 'lucide-react';
import { formatDate, formatMoney, regionalDefaults, type RegionalPreferences } from '@/lib/regional';

export default function BillsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState<RegionalPreferences>(regionalDefaults);

    useEffect(() => {
        try { const saved = localStorage.getItem('oxfin-regional-preferences'); if (saved) setPreferences({ ...regionalDefaults, ...JSON.parse(saved) }); } catch { /* use defaults */ }
        fetch('/api/user/transactions').then((res) => res.json()).then((data) => setTransactions(data.transactions || [])).finally(() => setLoading(false));
    }, []);

    const billActivity = useMemo(() => transactions.filter((txn) => /bill|rent|utility|electric|internet|insurance|subscription|phone/i.test(txn.description || '')), [transactions]);
    const total = billActivity.reduce((sum, txn) => sum + Math.abs(Number(txn.amount) || 0), 0);

    return <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8 pb-24 relative z-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5"><div><p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Payments</p><h1 className="text-3xl font-bold text-white tracking-tight">Bills & Payments</h1><p className="text-white/55 mt-2">Manage bills from your connected account activity.</p></div><button disabled className="glass-button-secondary px-5 py-3 rounded-xl font-semibold text-sm opacity-60 cursor-not-allowed"><Plus size={16} className="inline mr-2" />Add bill</button></header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="stat-card"><CalendarClock className="text-amber-300 mb-4" size={20} /><p className="text-xs text-white/40 uppercase tracking-widest">Upcoming</p><p className="text-xl text-white font-bold mt-2">Not connected</p></div><div className="stat-card"><ReceiptText className="text-blue-300 mb-4" size={20} /><p className="text-xs text-white/40 uppercase tracking-widest">Detected activity</p><p className="text-xl text-white font-bold mt-2">{billActivity.length}</p></div><div className="stat-card"><FileText className="text-emerald-300 mb-4" size={20} /><p className="text-xs text-white/40 uppercase tracking-widest">Tracked total</p><p className="text-xl text-white font-bold mt-2">{formatMoney(total, preferences)}</p></div></div>
        <section className="card-swiss p-6"><h2 className="text-lg font-bold text-white">Bill activity</h2><p className="text-sm text-white/45 mt-1 mb-6">Detected from transactions already available to OxFin.</p>{loading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-white/50" /></div> : billActivity.length ? <div className="divide-y divide-white/10">{billActivity.map((txn) => <div key={txn.id} className="py-4 flex items-center justify-between gap-4"><div><p className="font-semibold text-white">{txn.description}</p><p className="text-xs text-white/45 mt-1">{formatDate(txn.created_at, preferences)} · {txn.type}</p></div><span className="font-semibold text-white">{formatMoney(Math.abs(Number(txn.amount)), preferences)}</span></div>)}</div> : <div className="py-12 text-center"><p className="text-white/55">No bill activity is available yet.</p><p className="text-sm text-white/35 mt-2">Connect a bank or add a bill when those integrations are enabled.</p></div>}</section>
    </div>;
}
