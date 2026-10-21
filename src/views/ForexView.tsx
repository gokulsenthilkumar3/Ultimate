import React, { useState } from 'react';
import {
  Globe2,
  TrendingUp,
  TrendingDown,
  Activity,
  Cpu,
  BarChart2,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sparkline } from '../components/ui/Charts';

export const ForexView: React.FC = () => {
  const { forexPairs } = useApp();
  const [selectedPair, setSelectedPair] = useState(forexPairs[0]);
  const [scenario, setScenario] = useState<{
    interestRateShift: number; // in bps
    oilShock: number; // in %
    inflationChange: number; // in %
  }>({
    interestRateShift: 0,
    oilShock: 0,
    inflationChange: 0,
  });

  // Calculate adjusted prediction score based on multi-factor scenario
  const scenarioAdjustment =
    (scenario.interestRateShift / 100) * 0.4 +
    (scenario.oilShock / 10) * -0.2 +
    (scenario.inflationChange / 5) * -0.3;

  const adjustedConfidence = Math.min(
    98,
    Math.max(50, selectedPair.confidence + Math.round(scenarioAdjustment * 10))
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Forex Ensemble Prediction Engine
          </h2>
          <p className="text-xs text-white/50">
            Multi-factor machine learning forecasts, technical indicators, and scenario stress testing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-purple flex items-center gap-1.5">
            <Cpu size={12} /> Ensemble Model Tier 1
          </span>
        </div>
      </div>

      {/* ── Currency Pairs Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {forexPairs.map((p) => {
          const isSelected = selectedPair.pair === p.pair;
          const isPositive = p.change >= 0;

          return (
            <button
              key={p.pair}
              onClick={() => setSelectedPair(p)}
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                isSelected
                  ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white">{p.pair}</span>
                <span
                  className={`text-[10px] font-bold ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPositive ? '+' : ''}{p.changePercent}%
                </span>
              </div>
              <p className="text-base font-extrabold text-white font-mono tracking-tight">
                {p.rate.toFixed(4)}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    p.signal.includes('Buy')
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : p.signal.includes('Sell')
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {p.signal}
                </span>
                <Sparkline data={p.sparkline} isPositive={isPositive} width={45} height={18} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Active Pair Deep Dive ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Metrics & Technicals */}
        <div className="lg:col-span-2 card-swiss p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-white">{selectedPair.pair}</h3>
                <span
                  className={`badge ${
                    selectedPair.signal.includes('Buy')
                      ? 'badge-emerald'
                      : selectedPair.signal.includes('Sell')
                      ? 'badge-rose'
                      : 'badge-blue'
                  }`}
                >
                  Signal: {selectedPair.signal} ({adjustedConfidence}% Confidence)
                </span>
              </div>
              <p className="text-xs text-white/40 mt-1">
                Base: {selectedPair.base} · Quote: {selectedPair.quote} · Spot Rate: {selectedPair.rate}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-white/40 block">Market Bias</span>
              <span className="text-xs font-bold text-emerald-400">{selectedPair.sentiment}</span>
            </div>
          </div>

          {/* Indicators Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                RSI (14-period)
              </span>
              <p className="text-lg font-bold text-white font-mono">{selectedPair.rsi}</p>
              <span className="text-[10px] text-white/50">
                {selectedPair.rsi > 70 ? 'Overbought' : selectedPair.rsi < 30 ? 'Oversold' : 'Neutral Range'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                MACD Oscillator
              </span>
              <p className="text-lg font-bold text-emerald-400 font-mono">
                +{selectedPair.macd}
              </p>
              <span className="text-[10px] text-emerald-400/80">Bullish Momentum</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-[10px] uppercase font-bold text-white/40 block mb-1">
                Ensemble Weighting
              </span>
              <p className="text-lg font-bold text-blue-400 font-mono">{adjustedConfidence}%</p>
              <span className="text-[10px] text-white/50">XGBoost + LSTM Blend</span>
            </div>
          </div>

          {/* Model Explanation */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Activity size={14} className="text-blue-400" />
              Machine Learning Feature Importance
            </h4>
            <p className="text-xs text-white/60 leading-relaxed">
              The deep ensemble pipeline analyzed interest rate differentials, yield curves, commodity Pink Sheets,
              and sentiment vectors. Current consensus projects upward momentum for {selectedPair.base} with low tail-risk volatility.
            </p>
          </div>
        </div>

        {/* Multi-Factor Scenario Simulator */}
        <div className="card-swiss p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-purple-400" />
            <h3 className="text-sm font-bold text-white">Scenario Sensitivity Test</h3>
          </div>
          <p className="text-xs text-white/40">
            Stress-test model predictions against global macro shocks
          </p>

          <div className="space-y-4 text-xs">
            {/* Rate shift */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-white/60">Central Bank Rate Hike/Cut</span>
                <span className="text-white font-mono font-bold">
                  {scenario.interestRateShift > 0 ? '+' : ''}{scenario.interestRateShift} bps
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="25"
                value={scenario.interestRateShift}
                onChange={(e) =>
                  setScenario({ ...scenario, interestRateShift: parseInt(e.target.value) })
                }
                className="w-full accent-blue-500 bg-white/10"
              />
            </div>

            {/* Oil shock */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-white/60">Crude Oil Price Shock</span>
                <span className="text-white font-mono font-bold">
                  {scenario.oilShock > 0 ? '+' : ''}{scenario.oilShock}%
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="5"
                value={scenario.oilShock}
                onChange={(e) =>
                  setScenario({ ...scenario, oilShock: parseInt(e.target.value) })
                }
                className="w-full accent-amber-500 bg-white/10"
              />
            </div>

            {/* Inflation Change */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-white/60">CPI Inflation Spike</span>
                <span className="text-white font-mono font-bold">
                  {scenario.inflationChange > 0 ? '+' : ''}{scenario.inflationChange}%
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="1"
                value={scenario.inflationChange}
                onChange={(e) =>
                  setScenario({ ...scenario, inflationChange: parseInt(e.target.value) })
                }
                className="w-full accent-rose-500 bg-white/10"
              />
            </div>

            {/* Simulated outcome */}
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 mt-4 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-purple-300 block">
                Stress-Tested Output
              </span>
              <p className="text-sm font-bold text-white">
                Forecast: {selectedPair.signal} ({adjustedConfidence}% Confidence)
              </p>
              <p className="text-[11px] text-white/50">
                Resilience rating is high under these simulated macro constraints.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ForexView;
