import React from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Send,
  PlusCircle,
  FileText,
  CreditCard,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PhysicalCard } from '../components/ui/PhysicalCard';
import { CashFlowBarChart, CategoryBreakdown } from '../components/ui/Charts';

export const DashboardView: React.FC = () => {
  const {
    wallets,
    transactions,
    budget,
    investments,
    profile,
    formatMoney,
    setActiveTab,
    setIsTransferModalOpen,
    setIsAddTransactionOpen,
    setIsAddBillOpen,
  } = useApp();

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
  const totalInvested = investments.reduce((acc, i) => acc + i.shares * i.currentPrice, 0);

  const totalInflow = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netSavings = totalInflow - totalOutflow;

  const primaryWallet = wallets[0] || {
    balance: 0,
    name: 'Ox Wallet',
    isLocked: false,
  };

  return (
    <div className="space-y-6">
      {/* ── Ambient Orbs ── */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-orb" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-orb-delayed" />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Worth */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
              Total Liquidity
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white font-mono tracking-tight mb-1">
            {formatMoney(totalBalance)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <TrendingUp size={13} />
            <span>+2.4% yield compounded</span>
          </div>
        </div>

        {/* Total Inflow */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
              Cash Inflow
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight mb-1">
            {formatMoney(totalInflow)}
          </p>
          <span className="text-xs text-white/40">Includes salary & credits</span>
        </div>

        {/* Total Outflow */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
              Total Outflow
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white/90 font-mono tracking-tight mb-1">
            {formatMoney(totalOutflow)}
          </p>
          <span className="text-xs text-white/40">Tracked debits & payments</span>
        </div>

        {/* Investments Value */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
              Portfolio Assets
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-purple-300 font-mono tracking-tight mb-1">
            {formatMoney(totalInvested)}
          </p>
          <span className="text-xs text-emerald-400 font-semibold">+6.8% all-time returns</span>
        </div>
      </div>

      {/* ── AI Intelligence Insight Banner ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-blue-500/25 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
          <Sparkles size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">FinSync Personal CFO Recommendation</h3>
            <span className="badge badge-emerald">On Track</span>
          </div>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">
            Your savings rate is currently sitting at{' '}
            <strong className="text-white font-bold">
              {totalInflow > 0 ? Math.round((netSavings / totalInflow) * 100) : 0}%
            </strong>
            . Based on your {budget.rule} target, allocating{' '}
            <strong className="text-emerald-300 font-semibold">
              {formatMoney(Math.round(budget.savings * 0.35))}
            </strong>{' '}
            into the Nifty 50 Index SIP this Friday will maximize your annual tax-advantaged return.
          </p>
        </div>
      </div>

      {/* ── Quick Action Buttons ── */}
      <div className="card-swiss p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/30 mb-3">
          Quick Operations
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-3 p-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-white transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send size={15} className="text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold">Send / Transfer</p>
              <p className="text-[10px] text-white/40">Instant P2P</p>
            </div>
          </button>

          <button
            onClick={() => setIsAddTransactionOpen(true)}
            className="flex items-center gap-3 p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-white transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle size={15} className="text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold">Add Entry</p>
              <p className="text-[10px] text-white/40">Log spending</p>
            </div>
          </button>

          <button
            onClick={() => setIsAddBillOpen(true)}
            className="flex items-center gap-3 p-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-white transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={15} className="text-purple-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold">New Bill</p>
              <p className="text-[10px] text-white/40">Set reminder</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard size={15} className="text-white/70" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold">Manage Cards</p>
              <p className="text-[10px] text-white/40">Limits & Freeze</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Main Split: Charts & Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Cashflow & Spending */}
        <div className="lg:col-span-2 space-y-6">
          {/* Income vs Spend Chart */}
          <div className="card-swiss p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Cashflow Dynamics</h3>
                <p className="text-xs text-white/40">Weekly income vs expense movement</p>
              </div>
              <span className="badge badge-blue">Real-Time Sync</span>
            </div>
            <CashFlowBarChart />
          </div>

          {/* Recent Activity List */}
          <div className="card-swiss p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
                <p className="text-xs text-white/40">Latest activity from your connected accounts</p>
              </div>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <span>View All ({transactions.length})</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {transactions.slice(0, 5).map((t) => {
                const isCredit = t.amount > 0;
                return (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                        {t.icon || '💳'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {t.description}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {t.date} · {t.category}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold font-mono whitespace-nowrap ${
                        isCredit ? 'text-emerald-400' : 'text-white/80'
                      }`}
                    >
                      {isCredit ? '+' : '-'}{formatMoney(Math.abs(t.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1/3: Physical Card & Category Breakdown */}
        <div className="space-y-6">
          {/* Card Preview */}
          <div className="card-swiss p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
                Primary Card
              </h3>
              <button
                onClick={() => setActiveTab('cards')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Settings
              </button>
            </div>
            <PhysicalCard
              balance={primaryWallet.balance}
              cardHolder={profile.name}
              isLocked={primaryWallet.isLocked}
              variant="primary"
            />
          </div>

          {/* Category Breakdown */}
          <div className="card-swiss p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Expense Distribution</h3>
              <button
                onClick={() => setActiveTab('budget')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Budget Plan
              </button>
            </div>
            <CategoryBreakdown />
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardView;
