import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  Wallet,
  TrendingUp,
  CalendarCheck,
  CreditCard,
  Globe2,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC<{
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}> = ({ mobileOpen, setMobileOpen }) => {
  const { activeTab, setActiveTab, profile, wallets, formatMoney } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt, badge: 'New' },
    { id: 'budget', label: 'Budget Planner', icon: PiggyBank },
    { id: 'wallets', label: 'Wallets & Crypto', icon: Wallet },
    { id: 'investments', label: 'Investments', icon: TrendingUp },
    { id: 'bills', label: 'Bills & Pay', icon: CalendarCheck },
    { id: 'cards', label: 'Cards', icon: CreditCard },
    { id: 'forex', label: 'Forex AI Model', icon: Globe2, badge: 'AI' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#08080d]/90 backdrop-blur-2xl border-r border-white/10 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/20">
              <span className="text-white font-extrabold text-base tracking-wider">FS</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-white tracking-tight">FinSync One</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  OS
                </span>
              </div>
              <p className="text-[11px] text-white/40">GrowthTrack Ultimate</p>
            </div>
          </div>

          {/* Quick Balance Preview */}
          <div className="mt-5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-1">
              <span>Total Available</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
            <p className="text-lg font-bold text-white font-mono tracking-tight">
              {formatMoney(totalBalance)}
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] uppercase font-bold tracking-widest text-white/30 mb-2">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-white border border-blue-500/30 shadow-md shadow-blue-500/10'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={17}
                    className={isActive ? 'text-blue-400' : 'text-white/40'}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.badge === 'AI'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.01]">
          <div
            onClick={() => {
              setActiveTab('settings');
              setMobileOpen(false);
            }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs border border-white/10 group-hover:scale-105 transition-transform">
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{profile.name}</p>
              <div className="flex items-center gap-1 text-[10px] text-white/40">
                <ShieldCheck size={11} className="text-emerald-400" />
                <span>{profile.plan}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
