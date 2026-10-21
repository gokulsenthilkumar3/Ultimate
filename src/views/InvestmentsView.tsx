import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sparkline } from '../components/ui/Charts';
import { InvestmentAsset } from '../types';

export const InvestmentsView: React.FC = () => {
  const { investments, tradeAsset, formatMoney, wallets } = useApp();
  const [selectedAsset, setSelectedAsset] = useState<InvestmentAsset | null>(null);
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [sharesInput, setSharesInput] = useState<string>('1');
  const [tradeMessage, setTradeMessage] = useState<string>('');

  const totalInvested = investments.reduce((acc, i) => acc + i.invested, 0);
  const totalCurrentValue = investments.reduce(
    (acc, i) => acc + i.shares * i.currentPrice,
    0
  );
  const totalPL = totalCurrentValue - totalInvested;
  const plPercentage = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    const shares = parseFloat(sharesInput);
    if (!shares || shares <= 0) return;

    const cost = shares * selectedAsset.currentPrice;

    if (tradeAction === 'buy' && wallets[0].balance < cost) {
      setTradeMessage(`Insufficient balance in ${wallets[0].name} to buy.`);
      return;
    }

    if (tradeAction === 'sell' && selectedAsset.shares < shares) {
      setTradeMessage(`You only hold ${selectedAsset.shares} units.`);
      return;
    }

    tradeAsset(selectedAsset.id, tradeAction, shares);
    setTradeMessage(`Successfully ${tradeAction === 'buy' ? 'purchased' : 'sold'} ${shares} units of ${selectedAsset.ticker}!`);
    setTimeout(() => {
      setSelectedAsset(null);
      setTradeMessage('');
      setSharesInput('1');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Investment Portfolio</h2>
          <p className="text-xs text-white/50">
            Multi-asset capital allocation across Equities, Mutual Funds, Bitcoin ETF & Gold
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-emerald flex items-center gap-1">
            <ShieldCheck size={12} /> Live Valuation
          </span>
        </div>
      </div>

      {/* ── Performance Hero Banner ── */}
      <div className="card-swiss p-6 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">
              Current Portfolio Value
            </span>
            <p className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {formatMoney(totalCurrentValue)}
            </p>
            <p className="text-xs text-white/40 mt-1">
              Invested Capital: {formatMoney(totalInvested)}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">
              Unrealized Profit & Loss (P&L)
            </span>
            <div className="flex items-center gap-2">
              <p
                className={`text-2xl font-bold font-mono ${
                  totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {totalPL >= 0 ? '+' : ''}{formatMoney(totalPL)}
              </p>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  totalPL >= 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {totalPL >= 0 ? '+' : ''}{plPercentage.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-white/40 mt-1">Overall return rate</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">
              Liquid Cash Reserve
            </span>
            <p className="text-2xl font-bold text-white/90 font-mono">
              {formatMoney(wallets[0]?.balance || 0)}
            </p>
            <p className="text-xs text-emerald-400 font-semibold mt-1">Ready for re-investment</p>
          </div>
        </div>
      </div>

      {/* ── Asset Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {investments.map((asset) => {
          const value = asset.shares * asset.currentPrice;
          const assetPL = value - asset.invested;
          const isPositive = asset.dayChange >= 0;

          // Mock sparkline array from path
          const sparklineData = isPositive
            ? [asset.currentPrice * 0.96, asset.currentPrice * 0.98, asset.currentPrice * 0.97, asset.currentPrice * 0.99, asset.currentPrice]
            : [asset.currentPrice * 1.04, asset.currentPrice * 1.02, asset.currentPrice * 1.03, asset.currentPrice * 1.01, asset.currentPrice];

          return (
            <div key={asset.id} className="card-swiss p-5 space-y-4 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                    {asset.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{asset.name}</h4>
                    <span className="text-[10px] text-white/40 font-semibold">
                      {asset.ticker} · {asset.category}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-white font-mono">
                    {formatMoney(value)}
                  </p>
                  <span
                    className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {isPositive ? '+' : ''}{asset.dayChange}% Today
                  </span>
                </div>
              </div>

              {/* Sparkline & Stats Row */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-white/40 block">Holdings</span>
                  <p className="text-xs font-semibold text-white">
                    {asset.shares} units @ {formatMoney(asset.currentPrice)}
                  </p>
                </div>

                <Sparkline data={sparklineData} isPositive={isPositive} width={90} height={26} />

                <div className="text-right">
                  <span className="text-[10px] text-white/40 block">Returns</span>
                  <p
                    className={`text-xs font-bold font-mono ${
                      assetPL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {assetPL >= 0 ? '+' : ''}{formatMoney(assetPL)}
                  </p>
                </div>
              </div>

              {/* Quick Trade Button */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setSelectedAsset(asset);
                    setTradeAction('buy');
                  }}
                  className="flex-1 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={13} /> Buy More
                </button>
                <button
                  onClick={() => {
                    setSelectedAsset(asset);
                    setTradeAction('sell');
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Minus size={13} /> Sell Units
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Trade Execution Modal ── */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md card-swiss p-6 bg-[#0c0c14] border border-white/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                {tradeAction === 'buy' ? 'Buy Asset' : 'Sell Asset'} — {selectedAsset.name}
              </h3>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-white/40 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            {tradeMessage ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-xs text-white font-semibold">{tradeMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleExecuteTrade} className="space-y-4">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Current Price</span>
                  <span className="text-white font-mono font-bold">
                    {formatMoney(selectedAsset.currentPrice)}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/40">
                    Units / Shares to {tradeAction}
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={sharesInput}
                    onChange={(e) => setSharesInput(e.target.value)}
                    required
                    className="w-full glass-input px-3 py-2 rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex justify-between text-xs">
                  <span className="text-white/50">Estimated Value</span>
                  <span className="text-white font-mono font-bold">
                    {formatMoney((parseFloat(sharesInput) || 0) * selectedAsset.currentPrice)}
                  </span>
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all ${
                    tradeAction === 'buy'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  Confirm {tradeAction === 'buy' ? 'Purchase' : 'Sale'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default InvestmentsView;
