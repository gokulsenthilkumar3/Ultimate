import React, { useState } from 'react';
import { PiggyBank, CheckCircle, Lightbulb, AlertTriangle, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BudgetView: React.FC = () => {
  const { budget, updateBudget, transactions, formatMoney } = useApp();

  const [incomeInput, setIncomeInput] = useState<string>(budget.income.toString());
  const [selectedRule, setSelectedRule] = useState<typeof budget.rule>(budget.rule);
  const [savedNotice, setSavedNotice] = useState(false);

  // Compute spent amounts
  let needsSpent = 0;
  let wantsSpent = 0;
  let savingsInvested = 0;

  transactions.forEach((t) => {
    if (t.amount < 0) {
      const amt = Math.abs(t.amount);
      if (['Housing', 'Utilities', 'Food', 'Insurance', 'Bill'].includes(t.category) || t.type === 'bill') {
        needsSpent += amt;
      } else if (['Investment'].includes(t.category) || t.type === 'investment') {
        savingsInvested += amt;
      } else {
        wantsSpent += amt;
      }
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const inc = parseFloat(incomeInput) || 0;
    updateBudget(inc, selectedRule);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const ruleDescriptions: Record<string, string> = {
    '50/30/20':
      'The classic 50/30/20 rule: 50% for essential needs (rent, groceries, bills), 30% for lifestyle wants (dining, hobbies), and 20% dedicated to wealth building & emergency reserves.',
    '70/20/10':
      'Best suited for high cost-of-living metropolitan zones: 70% goes towards non-negotiable living needs, 20% for discretionary wants, and 10% for systematic savings.',
    '40/40/20':
      'Balanced lifestyle framework: keeps essential overhead lean at 40% while freeing 40% for experiences, equipment, and personal development, maintaining 20% investment.',
    '60/20/20':
      'Heavy-needs framework: tailored for growing families or dual-dependency obligations with 60% essential overhead, 20% wants, and 20% savings.',
  };

  const needsPct = budget.needs > 0 ? Math.min(100, (needsSpent / budget.needs) * 100) : 0;
  const wantsPct = budget.wants > 0 ? Math.min(100, (wantsSpent / budget.wants) * 100) : 0;
  const savingsPct = budget.savings > 0 ? Math.min(100, (savingsInvested / budget.savings) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Personal CFO Budget Planner</h2>
        <p className="text-xs text-white/50">
          Configure rule-based income allocation thresholds and monitor real-time compliance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Configuration form */}
        <div className="card-swiss p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PiggyBank size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Target Allocation</h3>
              <p className="text-[11px] text-white/40">Adjust base income & active rule</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                Monthly Net Income
              </label>
              <input
                type="number"
                min="1000"
                step="100"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                required
                className="w-full glass-input px-3.5 py-2.5 rounded-xl font-mono text-sm font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                Framework Model
              </label>
              <select
                value={selectedRule}
                onChange={(e) => setSelectedRule(e.target.value as any)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#121218]"
              >
                <option value="50/30/20">50/30/20 Rule (Standard)</option>
                <option value="70/20/10">70/20/10 Rule (High Living Cost)</option>
                <option value="40/40/20">40/40/20 Rule (Balanced-High Spend)</option>
                <option value="60/20/20">60/20/20 Rule (Heavy Needs)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full glass-button py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 mt-2"
            >
              <span>Save & Rebalance</span>
              <ArrowRight size={14} />
            </button>

            {savedNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle size={15} />
                <span>Budget plan saved and rebalanced!</span>
              </div>
            )}
          </form>

          {/* Model info text */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-white/70 font-semibold">
              <Lightbulb size={14} className="text-amber-400" />
              <span>About {selectedRule} Framework</span>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed">
              {ruleDescriptions[selectedRule]}
            </p>
          </div>
        </div>

        {/* Right 2/3: Breakdown cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Allocation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Needs Card */}
            <div className="card-swiss p-5 space-y-3 border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Needs ({budget.rule.split('/')[0]}%)
                </span>
                <span className="badge badge-rose">Essential</span>
              </div>
              <p className="text-xl font-extrabold text-white font-mono">
                {formatMoney(budget.needs)}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-white/50">
                  <span>Spent: {formatMoney(needsSpent)}</span>
                  <span>{needsPct.toFixed(0)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill bg-rose-500"
                    style={{ width: `${needsPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Wants Card */}
            <div className="card-swiss p-5 space-y-3 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Wants ({budget.rule.split('/')[1]}%)
                </span>
                <span className="badge badge-amber">Lifestyle</span>
              </div>
              <p className="text-xl font-extrabold text-white font-mono">
                {formatMoney(budget.wants)}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-white/50">
                  <span>Spent: {formatMoney(wantsSpent)}</span>
                  <span>{wantsPct.toFixed(0)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill bg-amber-500"
                    style={{ width: `${wantsPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Savings Card */}
            <div className="card-swiss p-5 space-y-3 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Savings ({budget.rule.split('/')[2]}%)
                </span>
                <span className="badge badge-emerald">Invested</span>
              </div>
              <p className="text-xl font-extrabold text-white font-mono">
                {formatMoney(budget.savings)}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-white/50">
                  <span>Allocated: {formatMoney(savingsInvested)}</span>
                  <span>{savingsPct.toFixed(0)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill bg-emerald-500"
                    style={{ width: `${savingsPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Health Advice & Quotient */}
          <div className="card-swiss p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Cashflow Health Quotient</h3>
              <span className="badge badge-emerald">Optimal</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle size={16} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">Personal Finance Diagnostics</h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  Your current expense-to-income quotient is sitting at an efficient{' '}
                  <strong className="text-emerald-300 font-bold">
                    {budget.income > 0 ? Math.round(((needsSpent + wantsSpent) / budget.income) * 100) : 0}%
                  </strong>
                  . You are consistently below your critical ceiling of{' '}
                  {budget.rule.split('/')[0]}% needs limit, preserving surplus capital for automated SIP investments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default BudgetView;
