import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  ArrowRightLeft,
  Plus,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC<{
  setMobileOpen: (open: boolean) => void;
}> = ({ setMobileOpen }) => {
  const {
    activeTab,
    setIsTransferModalOpen,
    setIsAddTransactionOpen,
    profile,
  } = useApp();

  const [notificationOpen, setNotificationOpen] = useState(false);

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Command Center',
      subtitle: `Welcome back, ${profile.name.split(' ')[0]} 👋 — Financial operations & health overview`,
    },
    transactions: {
      title: 'Transaction Ledger',
      subtitle: 'Complete history of cashflow, receipts, and categorized spend',
    },
    budget: {
      title: 'Personal CFO Budget Planner',
      subtitle: 'Configured threshold rules (50/30/20) and automated cash allocation',
    },
    wallets: {
      title: 'Wallets & Ox Crypto',
      subtitle: 'Ox Full Wallet, Gold-pegged Wallet Lite, interest compounding & crypto rates',
    },
    investments: {
      title: 'Investment Portfolio',
      subtitle: 'Equity, Mutual Funds, Bitcoin ETF, and Sovereign Gold holding performance',
    },
    bills: {
      title: 'Bills & Subscriptions',
      subtitle: 'Automated recurring bill schedules, due alerts, and payment records',
    },
    cards: {
      title: 'Cards & Limits',
      subtitle: 'Manage physical and virtual FinSync One payment cards with freeze security',
    },
    forex: {
      title: 'Forex Ensemble Intelligence',
      subtitle: 'Multi-factor currency prediction models, technical indicators & market signals',
    },
    settings: {
      title: 'Settings & Security',
      subtitle: 'Manage account credentials, two-factor auth (MFA), and regional currency',
    },
  };

  const currentInfo = tabTitles[activeTab] || {
    title: 'FinSync Ultimate',
    subtitle: 'Unified Financial Intelligence OS',
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#050508]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
      {/* Left: Mobile trigger & Titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white lg:hidden"
          aria-label="Open Navigation"
        >
          <Menu size={18} />
        </button>

        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            {currentInfo.title}
          </h2>
          <p className="text-xs text-white/45 hidden sm:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Quick Add Expense */}
        <button
          onClick={() => setIsAddTransactionOpen(true)}
          className="glass-button-secondary px-3 py-2 rounded-xl text-xs font-semibold hidden md:flex items-center gap-1.5 hover:bg-white/10"
        >
          <Plus size={14} className="text-emerald-400" />
          <span>Add Entry</span>
        </button>

        {/* Transfer Button */}
        <button
          onClick={() => setIsTransferModalOpen(true)}
          className="glass-button px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-white/10"
        >
          <ArrowRightLeft size={14} />
          <span>Transfer</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </button>

          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-72 card-swiss p-4 bg-[#0c0c14] border border-white/15 shadow-2xl space-y-3 z-50">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white">Notifications</span>
                <span className="text-[10px] text-emerald-400 font-semibold">All Read</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-white font-medium">Electricity Bill Due</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Due in 7 days · ₹1,840</p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-white font-medium">Interest Credited</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Ox Wallet 6.5% APY daily return added</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default Header;
