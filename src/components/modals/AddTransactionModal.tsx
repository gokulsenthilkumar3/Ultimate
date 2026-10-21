import React, { useState } from 'react';
import { X, PlusCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AddTransactionModal: React.FC = () => {
  const {
    isAddTransactionOpen,
    setIsAddTransactionOpen,
    addTransaction,
  } = useApp();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('Today');

  if (!isAddTransactionOpen) return null;

  const categories = [
    { name: 'Food', icon: '🍔' },
    { name: 'Shopping', icon: '🛍️' },
    { name: 'Entertainment', icon: '🎬' },
    { name: 'Utilities', icon: '⚡' },
    { name: 'Housing', icon: '🏠' },
    { name: 'Travel', icon: '✈️' },
    { name: 'Salary', icon: '💵' },
    { name: 'Investment', icon: '📊' },
    { name: 'Others', icon: '🏷️' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    const matchedIcon = categories.find((c) => c.name === category)?.icon || '💳';

    addTransaction({
      description: description.trim() || `${category} ${type}`,
      category,
      amount: type === 'expense' ? -val : val,
      type,
      date,
      icon: matchedIcon,
      status: 'completed',
    });

    setIsAddTransactionOpen(false);
    setDescription('');
    setAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md card-swiss p-6 bg-[#0a0a10]/95 border border-white/15 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PlusCircle size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Transaction</h3>
              <p className="text-[11px] text-white/40">Record cash inflow or spending</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddTransactionOpen(false)}
            className="p-1 rounded-lg text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 p-1 bg-white/5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <ArrowUpRight size={14} /> Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('Salary');
              }}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <ArrowDownLeft size={14} /> Income
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
              Amount
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-base font-mono font-bold"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
              Description / Merchant
            </label>
            <input
              type="text"
              placeholder="e.g. Swiggy Gourmet, Supermarket, Client Payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-[#121218]"
            >
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
              Date Label
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full glass-button py-3 rounded-xl font-bold text-sm mt-2"
          >
            Save Transaction
          </button>
        </form>
      </div>
    </div>
  );
};
export default AddTransactionModal;
