"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PortfolioChart, SpendingPieChart, TransactionTrendChart } from '@/components/ui/Charts';
import PhysicalCard from '@/components/ui/PhysicalCard';
import TransferModal from '@/components/ui/TransferModal';
import { formatDate, formatMoney, regionalDefaults, type RegionalPreferences } from '@/lib/regional';
import {
    Send, ArrowDownRight, Zap, FileText, CreditCard, Loader2,
    RefreshCw, DownloadCloud, ArrowUpRight, TrendingUp,
    TrendingDown, Wallet, MoreHorizontal, Activity,
} from 'lucide-react';

/* ── Stat Card ──────────────────────────────────────────────────── */
function StatCard({
    label, value, sub, subPositive, icon: Icon, accentClass, glowClass, delay = 0,
}: {
    label: string; value: string; sub: string; subPositive: boolean;
    icon: any; accentClass: string; glowClass?: string; delay?: number;
}) {
    return (
        <div
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center ${accentClass}`}>
                <Icon size={18} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">{label}</p>
            <p className="text-2xl font-bold text-white mb-1.5">{value}</p>
            <div className={`flex items-center gap-1 text-xs font-semibold ${subPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {subPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {sub}
            </div>
        </div>
    );
}

/* ── Quick Action ───────────────────────────────────────────────── */
function QuickAction({ icon: Icon, label, colorClass, onClick }: { icon: any; label: string; colorClass: string; onClick?: () => void }) {
    return (
        <button onClick={onClick} className="flex flex-col items-center gap-2 group focus:outline-none">
            <div className={`w-13 h-13 w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass} text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg border border-white/10`}>
                <Icon size={22} />
            </div>
            <span className="text-[11px] font-medium text-white/50 group-hover:text-white/80 transition-colors">{label}</span>
        </button>
    );
}

const CHART_TABS = ['1W', '1M', '3M'] as const;

export default function Dashboard() {
    const { data: session } = useSession();
    const [balanceData, setBalanceData] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [chartTab, setChartTab] = useState<typeof CHART_TABS[number]>('1W');
    const [preferences, setPreferences] = useState<RegionalPreferences>(regionalDefaults);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    useEffect(() => {
        try {
            const saved = localStorage.getItem('oxfin-regional-preferences');
            if (saved) setPreferences({ ...regionalDefaults, ...JSON.parse(saved) });
        } catch { }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [balanceRes, txRes] = await Promise.all([
                fetch('/api/user/balance'),
                fetch('/api/user/transactions'),
            ]);
            if (balanceRes.ok && txRes.ok) {
                setBalanceData(await balanceRes.json());
                setTransactions((await txRes.json()).transactions || []);
            }
        } catch (e) {
            console.error('Dashboard fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (session) fetchData(); }, [session]);

    const visibleTransactions = transactions
        .filter(t => `${t.description} ${t.type}`.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 6);

    const totalBalance = balanceData?.totalBalance ?? 0;
    const monthlyIncome = transactions.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const monthlySpend = transactions.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const chartData = transactions.reduce<Record<string, { name: string; income: number; expense: number }>>((days, txn) => {
        const date = new Date(txn.created_at);
        const key = date.toISOString().slice(0, 10);
        days[key] ||= { name: date.toLocaleDateString(preferences.locale, { weekday: 'short' }), income: 0, expense: 0 };
        if (Number(txn.amount) >= 0) days[key].income += Number(txn.amount);
        else days[key].expense += Math.abs(Number(txn.amount));
        return days;
    }, {});
    const spendingData = Object.entries(transactions.filter(t => Number(t.amount) < 0).reduce<Record<string, number>>((groups, txn) => { const key = txn.type || 'Other'; groups[key] = (groups[key] || 0) + Math.abs(Number(txn.amount)); return groups; }, {})).map(([name, value]) => ({ name, value }));

    const exportCSV = () => {
        const rows = visibleTransactions.map(t => [formatDate(t.created_at, preferences), t.description, t.type, t.amount, t.currency]);
        const csv = [['Date', 'Description', 'Type', 'Amount', 'Currency'], ...rows]
            .map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = 'oxfin-activity.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-24 relative z-10">
            {/* Ambient orbs */}
            <div className="fixed top-[5%] left-[25%] w-[45%] h-[35%] bg-blue-600/8 rounded-full blur-[130px] animate-orb pointer-events-none -z-10" />
            <div className="fixed bottom-[10%] right-[5%] w-[35%] h-[30%] bg-indigo-600/8 rounded-full blur-[130px] animate-orb-delayed pointer-events-none -z-10" />

            {/* ── Header ── */}
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-slide-up">
                <div>
                    <p className="text-sm text-white/40 font-medium mb-0.5">{greeting} 👋</p>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                        {session?.user?.name?.split(' ')[0] || 'Agent'}
                    </h1>
                </div>
                <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Search activity…" value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/8 bg-white/4 focus:bg-white/7 focus:border-white/15 focus:outline-none text-sm text-white placeholder:text-white/25 transition-all" />
                    </div>
                    <button onClick={fetchData} className="glass-button-secondary p-2.5 rounded-xl" aria-label="Refresh"><RefreshCw size={17} /></button>
                    <button onClick={exportCSV} className="glass-button-secondary p-2.5 rounded-xl" aria-label="Export"><DownloadCloud size={17} /></button>
                    <button onClick={() => setIsTransferModalOpen(true)} className="glass-button px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
                        <Zap size={16} /> Transfer
                    </button>
                </div>
            </header>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Balance" value={loading ? '—' : formatMoney(totalBalance, preferences)}
                    sub="+2.4% this month" subPositive icon={Wallet} accentClass="bg-blue-500/20 border border-blue-500/30" delay={0} />
                <StatCard label="Monthly Income" value={loading ? '—' : formatMoney(monthlyIncome, preferences)}
                    sub="+8.1% vs last month" subPositive icon={ArrowDownRight} accentClass="bg-emerald-500/20 border border-emerald-500/30" delay={80} />
                <StatCard label="Monthly Spend" value={loading ? '—' : formatMoney(monthlySpend, preferences)}
                    sub="-3.2% vs last month" subPositive={false} icon={ArrowUpRight} accentClass="bg-red-500/20 border border-red-500/30" delay={160} />
            </div>

            {/* ── Main Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left 2/3 */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Smart Insight Banner */}
                    <div className="flex items-start gap-4 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/8 animate-slide-up">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/25 flex items-center justify-center shrink-0 border border-blue-500/30">
                            <Zap size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Smart Insight</p>
                            <p className="text-sm text-white/60 mt-0.5 leading-relaxed">
                                You spent <span className="text-white font-semibold">10% less</span> on groceries this week.
                                Keep it up — you're on track to save <span className="text-emerald-400 font-semibold">$340</span> this month.
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="section-card p-5">
                        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Quick Actions</p>
                        <div className="grid grid-cols-4 gap-3">
                            <QuickAction icon={Send} label="Send" colorClass="bg-blue-600/70 hover:bg-blue-500/80 shadow-blue-500/20" onClick={() => setIsTransferModalOpen(true)} />
                            <Link href="/wallets" className="flex justify-center"><QuickAction icon={ArrowDownRight} label="Receive" colorClass="bg-emerald-600/70 hover:bg-emerald-500/80 shadow-emerald-500/20" /></Link>
                            <Link href="/bills" className="flex justify-center"><QuickAction icon={FileText} label="Pay Bill" colorClass="bg-purple-600/70 hover:bg-purple-500/80" /></Link>
                            <Link href="/cards" className="flex justify-center"><QuickAction icon={CreditCard} label="Cards" colorClass="bg-white/10 hover:bg-white/15" /></Link>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Income vs Expense */}
                        <div className="card-swiss p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white">Income vs Expense</h3>
                                <div className="flex gap-1">
                                    {CHART_TABS.map(t => (
                                        <button key={t} onClick={() => setChartTab(t)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${chartTab === t ? 'bg-white/12 text-white' : 'text-white/35 hover:text-white/60'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <TransactionTrendChart data={Object.values(chartData).slice(-7)} />
                        </div>

                        {/* Spending Breakdown */}
                        <div className="card-swiss p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white">Spending</h3>
                                <button className="text-white/30 hover:text-white/60 transition-colors"><MoreHorizontal size={18} /></button>
                            </div>
                            <SpendingPieChart data={spendingData} />
                        </div>
                    </div>
                </div>

                {/* Right 1/3 */}
                <div className="space-y-5">
                    {/* Physical Card */}
                    {loading ? (
                        <div className="card-swiss h-[200px] flex items-center justify-center">
                            <Loader2 className="w-7 h-7 text-white/30 animate-spin" />
                        </div>
                    ) : (
                        <PhysicalCard
                            balance={totalBalance}
                            cardHolder={session?.user?.name?.toUpperCase() || 'AGENT'}
                            expiry="09/29"
                        />
                    )}

                    {/* Portfolio mini */}
                    <div className="card-swiss p-5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 to-purple-600/8 pointer-events-none rounded-2xl" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-white/45 font-medium">Total Portfolio</p>
                                <span className="badge badge-emerald"><TrendingUp size={9} /> +12.5%</span>
                            </div>
                            <p className="text-2xl font-bold text-white mb-4">
                                {loading ? '—' : formatMoney(totalBalance, preferences)}
                            </p>
                            <div className="h-20 opacity-80"><PortfolioChart data={[]} /></div>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="card-swiss p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white">Recent Activity</h3>
                            <Link href="/transactions" className="text-xs text-white/40 hover:text-blue-400 font-medium transition-colors flex items-center gap-1">
                                View all <Activity size={12} />
                            </Link>
                        </div>
                        <div className="space-y-1">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between py-2.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl skeleton" />
                                            <div className="space-y-1.5">
                                                <div className="h-2.5 w-28 skeleton" />
                                                <div className="h-2 w-16 skeleton" />
                                            </div>
                                        </div>
                                        <div className="h-2.5 w-14 skeleton" />
                                    </div>
                                ))
                            ) : visibleTransactions.length > 0 ? (
                                visibleTransactions.map(txn => {
                                    const isIncome = parseFloat(txn.amount) > 0;
                                    return (
                                        <div key={txn.id} className="list-row group cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-105 ${isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/8 text-white/70'}`}>
                                                    {txn.description.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white leading-none">{txn.description}</p>
                                                    <p className="text-[11px] text-white/35 mt-0.5">{formatDate(txn.created_at, preferences)}</p>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-semibold ${isIncome ? 'text-emerald-400' : 'text-white/80'}`}>
                                                {isIncome ? '+' : ''}{formatMoney(Math.abs(parseFloat(txn.amount)), preferences)}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-white/30 text-center py-6">{search ? 'No results found.' : 'No transactions yet.'}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transfer Modal */}
            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                wallets={balanceData?.wallets || []}
                onSuccess={fetchData}
            />
        </div>
    );
}
