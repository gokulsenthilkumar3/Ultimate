'use client';

import Link from 'next/link';
import { ChartNoAxesCombined, Link2, ShieldCheck } from 'lucide-react';

export default function InvestmentsPage() {
    return <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-24 relative z-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div><p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Wealth</p><h1 className="text-3xl font-bold text-white tracking-tight">Investments</h1><p className="text-white/55 mt-2">Track your portfolio when an investment account is connected.</p></div>
            <button disabled className="glass-button-secondary px-5 py-3 rounded-xl font-semibold text-sm opacity-60 cursor-not-allowed"><Link2 size={16} className="inline mr-2" />Connect account</button>
        </header>
        <section className="card-swiss p-8 md:p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/20 text-blue-300 flex items-center justify-center mx-auto mb-6"><ChartNoAxesCombined size={30} /></div>
            <h2 className="text-2xl font-bold text-white">Your portfolio is waiting</h2>
            <p className="text-white/55 mt-3 leading-relaxed">No investment holdings are connected to this account yet. Connect a supported provider to see live holdings, returns, allocation, and transaction history.</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-emerald-300"><ShieldCheck size={15} /> Your data stays read-only until you approve an account connection.</div>
            <Link href="/settings" className="inline-block mt-8 glass-button px-5 py-3 rounded-xl text-sm font-bold">Open settings</Link>
        </section>
    </div>;
}
