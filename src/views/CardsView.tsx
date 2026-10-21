import React, { useState } from 'react';
import {
  CreditCard,
  Lock,
  Unlock,
  Shield,
  Smartphone,
  Globe,
  Sliders,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PhysicalCard } from '../components/ui/PhysicalCard';

export const CardsView: React.FC = () => {
  const { wallets, toggleWalletLock, profile, formatMoney } = useApp();
  const primaryWallet = wallets[0] || { balance: 0, id: 'w-1', isLocked: false };

  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [internationalEnabled, setInternationalEnabled] = useState(false);
  const [contactlessEnabled, setContactlessEnabled] = useState(true);

  const monthlyLimit = 150000;
  const currentSpend = 14820;
  const spendPct = Math.round((currentSpend / monthlyLimit) * 100);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Payment Cards</h2>
        <p className="text-xs text-white/50">
          Configure physical titanium and virtual FinSync One Visa cards
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Card visualization & Quick Status */}
        <div className="space-y-4">
          <PhysicalCard
            balance={primaryWallet.balance}
            cardHolder={profile.name}
            isLocked={primaryWallet.isLocked}
            variant="primary"
          />

          {/* Freeze / Lock Action Card */}
          <button
            onClick={() => toggleWalletLock(primaryWallet.id)}
            className="w-full card-swiss p-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  primaryWallet.isLocked
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {primaryWallet.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {primaryWallet.isLocked ? 'Card is Frozen / Locked' : 'Card is Active & Protected'}
                </p>
                <p className="text-xs text-white/40">
                  {primaryWallet.isLocked
                    ? 'Click to unfreeze and allow payments'
                    : 'Click to immediately block unauthorized charges'}
                </p>
              </div>
            </div>
            <span
              className={`badge ${
                primaryWallet.isLocked ? 'badge-rose' : 'badge-emerald'
              }`}
            >
              {primaryWallet.isLocked ? 'Frozen' : 'Unlocked'}
            </span>
          </button>
        </div>

        {/* Card Controls & Limits */}
        <div className="space-y-5">
          {/* Spend Limit */}
          <div className="card-swiss p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Monthly Spending Limit</h3>
              <span className="badge badge-blue">15% Used</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-white/40">Current Spend</span>
                <p className="text-lg font-bold text-white font-mono">{formatMoney(currentSpend)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-white/40">Remaining Limit</span>
                <p className="text-lg font-bold text-emerald-400 font-mono">
                  {formatMoney(monthlyLimit - currentSpend)}
                </p>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="progress-track">
                <div
                  className="progress-fill bg-blue-500"
                  style={{ width: `${spendPct}%` }}
                />
              </div>
              <p className="text-[10px] text-white/40">
                Total monthly allowance: {formatMoney(monthlyLimit)}
              </p>
            </div>
          </div>

          {/* Security & Feature Toggles */}
          <div className="card-swiss p-5 space-y-3">
            <h3 className="text-sm font-bold text-white mb-2">Usage Channels & Security</h3>

            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/70">
                  <Globe size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Online E-Commerce Transactions</p>
                  <p className="text-[10px] text-white/40">Authorize digital purchases & subscriptions</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={onlineEnabled}
                onChange={(e) => setOnlineEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-500 bg-white/10 border-white/20"
              />
            </div>

            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/70">
                  <Smartphone size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Contactless Tap-to-Pay (NFC)</p>
                  <p className="text-[10px] text-white/40">Instant POS checkout without PIN up to limit</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={contactlessEnabled}
                onChange={(e) => setContactlessEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-500 bg-white/10 border-white/20"
              />
            </div>

            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/70">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">International Cross-Border Usage</p>
                  <p className="text-[10px] text-white/40">Enable multi-currency settlement abroad</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={internationalEnabled}
                onChange={(e) => setInternationalEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-500 bg-white/10 border-white/20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CardsView;
