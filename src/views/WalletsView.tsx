import React, { useState } from 'react';
import {
  Wallet,
  Zap,
  Lock,
  Unlock,
  ShieldCheck,
  TrendingUp,
  Info,
  RefreshCw,
  Send,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PhysicalCard } from '../components/ui/PhysicalCard';
import { OxCryptoConverter } from '../components/ui/OxCryptoConverter';

export const WalletsView: React.FC = () => {
  const {
    wallets,
    toggleWalletLock,
    togglePinFree,
    profile,
    formatMoney,
    setIsTransferModalOpen,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);

  const fullWallet = wallets.find((w) => w.type === 'full') || wallets[0];
  const liteWallet = wallets.find((w) => w.type === 'lite') || wallets[1] || wallets[0];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Interest math: 6.5% APY daily
  const dailyInterest = fullWallet ? (fullWallet.balance * 0.065) / 365 : 0;
  const monthlyProjection = dailyInterest * 30;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Wallets & Ox Crypto</h2>
          <p className="text-xs text-white/50">
            Multi-currency liquidity, gold-pegged micro payments, and yield compounding
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`glass-button-secondary p-2.5 rounded-xl transition-all ${
              refreshing ? 'rotate-180' : ''
            }`}
            title="Refresh Balances"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="glass-button px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Send size={14} /> Send Money
          </button>
        </div>
      </div>

      {/* ── Wallets Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full Ox Wallet */}
        <div className="space-y-4">
          <PhysicalCard
            balance={fullWallet?.balance || 0}
            cardHolder={profile.name}
            variant="primary"
            isLocked={fullWallet?.isLocked}
          />

          <div className="card-swiss p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Wallet size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ox Wallet (Full)</h3>
                  <span className="badge badge-emerald">KYC Verified</span>
                </div>
              </div>

              <button
                onClick={() => fullWallet && toggleWalletLock(fullWallet.id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                {fullWallet?.isLocked ? (
                  <>
                    <Lock size={13} className="text-rose-400" />
                    <span className="text-rose-400">Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock size={13} className="text-emerald-400" />
                    <span>Active</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex justify-between py-2 border-b border-white/[0.05]">
                <span className="text-white/40">Interest Yield (APY)</span>
                <span className="font-semibold text-emerald-400 font-mono">6.50% p.a.</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.05]">
                <span className="text-white/40">Daily Accrued Interest</span>
                <span className="font-semibold text-white font-mono">
                  +{formatMoney(dailyInterest)} / day
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.05]">
                <span className="text-white/40">Monthly Compounded Projection</span>
                <span className="font-semibold text-white font-mono">
                  +{formatMoney(monthlyProjection)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-white/40">Transaction Ceiling</span>
                <span className="font-semibold text-white">Unlimited (Full Tier)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Lite (Gold Pegged) */}
        <div className="space-y-4">
          <PhysicalCard
            balance={liteWallet?.balance || 0}
            cardHolder={profile.name}
            variant="gold"
            isLocked={liteWallet?.isLocked}
          />

          <div className="card-swiss p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Wallet Lite (Micro-Pay)</h3>
                  <span className="badge badge-amber">Gold-Pegged Limit</span>
                </div>
              </div>

              <button
                onClick={() => liteWallet && togglePinFree(liteWallet.id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {liteWallet?.pinFreeEnabled ? (
                  <span className="text-emerald-400">PIN-Free ON</span>
                ) : (
                  <span className="text-white/50">PIN-Free OFF</span>
                )}
              </button>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex justify-between py-2 border-b border-white/[0.05]">
                <span className="text-white/40">Daily Micro Limit (1g 24K Gold)</span>
                <span className="font-semibold text-white font-mono">
                  {formatMoney(liteWallet?.dailyLimit || 12000)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/[0.05]">
                <span className="text-white/40">Tap & Pay Mode</span>
                <span className="font-semibold text-emerald-400">Instant Contactless</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-white/40">KYC Requirement</span>
                <span className="font-semibold text-white">Minimal / Device Bound</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ox Crypto & Gold Converter ── */}
      <OxCryptoConverter />
    </div>
  );
};
export default WalletsView;
