import React, { useState } from 'react';
import { X, CalendarClock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AddBillModal: React.FC = () => {
  const { isAddBillOpen, setIsAddBillOpen, addBill } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('2026-11-01');
  const [autoPay, setAutoPay] = useState(false);

  if (!isAddBillOpen) return null;

  const icons: Record<string, string> = {
    Utilities: '⚡',
    Entertainment: '🎬',
    Insurance: '🛡️',
    Rent: '🏠',
    Broadband: '🌐',
    Other: '🧾',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0 || !name.trim()) return;

    addBill({
      name: name.trim(),
      category,
      amount: val,
      dueDate,
      autoPay,
      icon: icons[category] || '🧾',
      status: autoPay ? 'Auto-pay' : 'Upcoming',
    });

    setIsAddBillOpen(false);
    setName('');
    setAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md card-swiss p-6 bg-[#0a0a10]/95 border border-white/15 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <CalendarClock size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add New Bill</h3>
              <p className="text-[11px] text-white/40">Track upcoming payments and subscriptions</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddBillOpen(false)}
            className="p-1 rounded-lg text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
              Biller / Service Name
            </label>
            <input
              type="text"
              placeholder="e.g. Broadband, Spotify, Health Insurance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-[#121218]"
            >
              <option value="Utilities">⚡ Utilities</option>
              <option value="Broadband">🌐 Broadband & Internet</option>
              <option value="Entertainment">🎬 Entertainment</option>
              <option value="Insurance">🛡️ Insurance</option>
              <option value="Rent">🏠 Rent / Housing</option>
              <option value="Other">🧾 Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                Amount
              </label>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-base font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPay}
              onChange={(e) => setAutoPay(e.target.checked)}
              className="w-4 h-4 rounded text-blue-500 focus:ring-0 bg-white/10 border-white/20"
            />
            <div>
              <p className="text-xs font-semibold text-white">Enable Auto-pay</p>
              <p className="text-[10px] text-white/40">Automatically record payment when due</p>
            </div>
          </label>

          <button
            type="submit"
            className="w-full glass-button py-3 rounded-xl font-bold text-sm mt-2"
          >
            Save Bill
          </button>
        </form>
      </div>
    </div>
  );
};
export default AddBillModal;
