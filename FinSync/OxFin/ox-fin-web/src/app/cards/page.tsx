'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Loader2, Lock, Unlock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import PhysicalCard from '@/components/ui/PhysicalCard';
import { formatMoney, regionalDefaults, type RegionalPreferences } from '@/lib/regional';

export default function CardsPage() {
    const { data: session } = useSession();
    const [wallets, setWallets] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [selected, setSelected] = useState(0);
    const [locked, setLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState<RegionalPreferences>(regionalDefaults);

    useEffect(() => {
        try { const saved = localStorage.getItem('oxfin-regional-preferences'); if (saved) setPreferences({ ...regionalDefaults, ...JSON.parse(saved) }); } catch { /* use defaults */ }
        if (!session) return;
        Promise.all([fetch('/api/user/balance'), fetch('/api/user/transactions')]).then(async ([balance, activity]) => { setWallets((await balance.json()).wallets || []); setTransactions((await activity.json()).transactions || []); }).finally(() => setLoading(false));
    }, [session]);

    const wallet = wallets[selected];
    const charges = transactions.filter((txn) => Number(txn.amount) < 0);
    return <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8 pb-24 relative z-10">
        <header><p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Payments</p><h1 className="text-3xl font-bold text-white">Cards</h1><p className="text-white/55 mt-2">Cards and payment activity connected to your OxFin wallets.</p></header>
        {loading ? <div className="card-swiss p-16 flex justify-center"><Loader2 className="animate-spin text-white/50" /></div> : wallets.length === 0 ? <div className="card-swiss p-12 text-center"><CreditCard className="mx-auto text-white/35 mb-4" size={36} /><h2 className="text-xl font-bold text-white">No cards or wallets yet</h2><p className="text-white/50 mt-2">Add a wallet to see its balance and payment activity here.</p></div> : <>
            <div className="flex gap-2 overflow-x-auto">{wallets.map((item, index) => <button key={item.id} onClick={() => setSelected(index)} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${selected === index ? 'bg-white text-slate-950' : 'bg-white/5 text-white/55'}`}>{item.type === 'full' ? 'Ox Wallet' : 'Wallet Lite'}</button>)}</div>
            <div className="max-w-xl"><PhysicalCard balance={Number(wallet?.balance || 0)} cardHolder={session?.user?.name?.toUpperCase() || 'ACCOUNT HOLDER'} expiry="—" variant={wallet?.type === 'full' ? 'primary' : 'dark'} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><button onClick={() => setLocked(!locked)} className="card-swiss p-5 flex items-center gap-4 text-left"><div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">{locked ? <Lock className="text-red-300" size={19} /> : <Unlock className="text-emerald-300" size={19} />}</div><div><p className="text-white font-semibold">{locked ? 'Wallet locked' : 'Wallet active'}</p><p className="text-white/45 text-sm">{locked ? 'Unlock to allow payments' : 'Tap to lock payments'}</p></div></button><div className="card-swiss p-5"><p className="text-xs text-white/40 uppercase tracking-widest">Available balance</p><p className="text-2xl font-bold text-white mt-2">{formatMoney(wallet?.balance || 0, preferences)}</p><p className="text-sm text-white/45 mt-1">From your connected wallet</p></div></div>
            <section className="card-swiss p-6"><h2 className="text-lg font-bold text-white">Recent payment activity</h2>{charges.length ? <div className="divide-y divide-white/10 mt-4">{charges.map((txn) => <div key={txn.id} className="py-4 flex items-center justify-between"><div><p className="font-semibold text-white">{txn.description}</p><p className="text-xs text-white/45 mt-1">{new Date(txn.created_at).toLocaleDateString(preferences.locale, { timeZone: preferences.timeZone })}</p></div><span className="text-white font-semibold">-{formatMoney(Math.abs(Number(txn.amount)), preferences)}</span></div>)}</div> : <p className="text-white/45 text-sm py-10 text-center">No payment activity is available yet.</p>}</section>
        </>}
    </div>;
}
