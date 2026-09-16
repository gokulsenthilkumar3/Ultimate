'use client';

import { useState } from 'react';
import { ArrowRightLeft, Info } from 'lucide-react';
import { usdToOx, oxToUsd, formatOxCurrency, formatUSD, OX_CRYPTO_RATE, BUY_FEE_PERCENT } from '@/lib/oxCrypto';

export default function OxCryptoConverter() {
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const [usdAmount, setUsdAmount] = useState<string>('100');
    const [oxAmount, setOxAmount] = useState<string>('');

    const handleConvert = () => {
        const amount = parseFloat(usdAmount);
        if (isNaN(amount) || amount <= 0) return;

        if (mode === 'buy') {
            const { ox, fee, total } = usdToOx(amount);
            setOxAmount(ox.toFixed(4));
        } else {
            const usd = oxToUsd(parseFloat(oxAmount));
            setUsdAmount(usd.toFixed(2));
        }
    };

    const result = mode === 'buy' && usdAmount ? usdToOx(parseFloat(usdAmount) || 0) : null;

    return (
        <div className="card-swiss p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-white">Ox Crypto Converter</h3>
                    <p className="text-sm text-white/55">1 ரூ = ${OX_CRYPTO_RATE} USD</p>
                </div>
                <button
                    onClick={() => setMode(mode === 'buy' ? 'sell' : 'buy')}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <ArrowRightLeft size={20} className="text-primary" />
                </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-white/10 rounded-xl">
                <button
                    onClick={() => setMode('buy')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${mode === 'buy' ? 'bg-white text-slate-950 shadow-sm' : 'text-white/55'
                        }`}
                >
                    Buy ரூ
                </button>
                <button
                    onClick={() => setMode('sell')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${mode === 'sell' ? 'bg-white text-slate-950 shadow-sm' : 'text-white/55'
                        }`}
                >
                    Sell ரூ
                </button>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">
                        {mode === 'buy' ? 'USD Amount' : 'Ox Crypto (ரூ)'}
                    </label>
                    <input
                        type="number"
                        value={mode === 'buy' ? usdAmount : oxAmount}
                        onChange={(e) => mode === 'buy' ? setUsdAmount(e.target.value) : setOxAmount(e.target.value)}
                        onBlur={handleConvert}
                        className="w-full px-4 py-3 rounded-xl border border-white/15 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white/5 focus:bg-white text-lg font-semibold"
                        placeholder="0.00"
                    />
                </div>

                {mode === 'buy' && result && (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/65">You'll receive:</span>
                            <span className="font-bold text-white">{formatOxCurrency(result.ox)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/65">Buy fee ({BUY_FEE_PERCENT}%):</span>
                            <span className="text-white">{formatUSD(result.fee)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                            <span className="font-medium text-white">Total cost:</span>
                            <span className="font-bold text-primary">{formatUSD(result.total)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <Info size={16} className="text-white/45 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-white/65">
                    {mode === 'buy'
                        ? `Includes ${BUY_FEE_PERCENT}% conversion fee. International transfers incur an additional ${BUY_FEE_PERCENT}% fee.`
                        : 'Selling Ox Crypto converts back to USD at the current rate with no fees.'}
                </p>
            </div>

            <button
                onClick={handleConvert}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
            >
                {mode === 'buy' ? 'Buy Ox Crypto' : 'Sell Ox Crypto'}
            </button>
        </div>
    );
}
