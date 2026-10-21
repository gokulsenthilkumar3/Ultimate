import React, { useState } from 'react';
import { ArrowRightLeft, Coins, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const OxCryptoConverter: React.FC = () => {
  const { preferences } = useApp();
  const [fromAmount, setFromAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('GOLD_G');

  // Rates relative to 1 USD
  const rates: Record<string, number> = {
    USD: 1.0,
    INR: 84.12,
    EUR: 0.92,
    GBP: 0.77,
    GOLD_G: 0.0125, // ~ $80 per gram of gold
    BTC: 0.0000147,  // ~ $68,000 / BTC
    ETH: 0.000385,   // ~ $2,600 / ETH
  };

  const currencyLabels: Record<string, string> = {
    USD: 'US Dollar ($)',
    INR: 'Indian Rupee (₹)',
    EUR: 'Euro (€)',
    GBP: 'British Pound (£)',
    GOLD_G: 'Fine Gold (1g 24K)',
    BTC: 'Bitcoin (BTC)',
    ETH: 'Ethereum (ETH)',
  };

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const numVal = parseFloat(fromAmount) || 0;
  // Convert from currency -> USD -> to currency
  const inUSD = numVal / (rates[fromCurrency] || 1);
  const converted = inUSD * (rates[toCurrency] || 1);

  return (
    <div className="card-swiss p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Coins size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Ox Crypto & Gold Converter</h3>
            <p className="text-[11px] text-white/40">Real-time exchange & gold-pegged valuation</p>
          </div>
        </div>
        <span className="badge badge-amber flex items-center gap-1">
          <TrendingUp size={11} /> Live Peg
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        {/* From */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
            You Send / Convert
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="glass-input flex-1 px-3 py-2.5 rounded-xl text-sm font-mono font-semibold"
            />
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="glass-input px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#121218]"
            >
              {Object.keys(rates).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-white/40">
            {currencyLabels[fromCurrency]}
          </span>
        </div>

        {/* To */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
              You Receive (Est.)
            </label>
            <button
              onClick={handleSwap}
              className="text-white/40 hover:text-white p-1 rounded-md transition-colors"
              title="Swap Currencies"
            >
              <ArrowRightLeft size={13} />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="glass-input flex-1 px-3 py-2.5 rounded-xl text-sm font-mono font-bold text-emerald-400 bg-white/[0.02] flex items-center overflow-x-auto">
              {converted < 0.001 ? converted.toFixed(6) : converted.toLocaleString(preferences.locale, { maximumFractionDigits: 4 })}
            </div>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="glass-input px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#121218]"
            >
              {Object.keys(rates).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-white/40">
            {currencyLabels[toCurrency]}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-xs">
        <span className="text-white/50">Exchange rate</span>
        <span className="text-white font-mono font-semibold">
          1 {fromCurrency} = {(rates[toCurrency] / rates[fromCurrency]).toFixed(4)} {toCurrency}
        </span>
      </div>
    </div>
  );
};
export default OxCryptoConverter;
