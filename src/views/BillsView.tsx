import React from 'react';
import {
  CalendarClock,
  Plus,
  CheckCircle,
  Trash2,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BillsView: React.FC = () => {
  const { bills, payBill, deleteBill, setIsAddBillOpen, formatMoney } = useApp();

  const totalUpcoming = bills
    .filter((b) => b.status !== 'Paid')
    .reduce((sum, b) => sum + b.amount, 0);

  const upcomingCount = bills.filter((b) => b.status !== 'Paid').length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Bills & Subscriptions</h2>
          <p className="text-xs text-white/50">
            Automate recurring expenses, view upcoming dues, and prevent missed deadlines
          </p>
        </div>

        <button
          onClick={() => setIsAddBillOpen(true)}
          className="glass-button px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus size={14} /> Add Bill
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <CalendarClock size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Total Pending Dues
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {formatMoney(totalUpcoming)}
          </p>
          <p className="text-xs text-amber-400 mt-1">{upcomingCount} payments need attention</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Receipt size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Active Subscriptions
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {bills.filter((b) => b.autoPay).length}
          </p>
          <p className="text-xs text-white/40 mt-1">Configured for auto-settlement</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <CheckCircle size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Settled This Cycle
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">
            {bills.filter((b) => b.status === 'Paid').length}
          </p>
          <p className="text-xs text-white/40 mt-1">No penalties incurred</p>
        </div>
      </div>

      {/* ── Bills List ── */}
      <div className="card-swiss divide-y divide-white/[0.06] overflow-hidden">
        {bills.length === 0 ? (
          <div className="py-16 text-center text-white/40 space-y-2">
            <AlertCircle size={24} className="mx-auto text-white/20" />
            <p className="text-sm">No scheduled bills yet. Tap "Add Bill" to create one.</p>
          </div>
        ) : (
          bills.map((bill) => {
            const isPaid = bill.status === 'Paid';
            return (
              <div
                key={bill.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                    {bill.icon || '🧾'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{bill.name}</h4>
                      <span
                        className={`badge ${
                          isPaid
                            ? 'badge-emerald'
                            : bill.autoPay
                            ? 'badge-blue'
                            : 'badge-amber'
                        }`}
                      >
                        {bill.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">
                      {bill.category} · Due by {bill.dueDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <p className="text-base font-extrabold text-white font-mono">
                    {formatMoney(bill.amount)}
                  </p>

                  <div className="flex items-center gap-2">
                    {!isPaid ? (
                      <button
                        onClick={() => payBill(bill.id)}
                        className="glass-button px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Pay Now
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle size={14} /> Paid
                      </span>
                    )}

                    <button
                      onClick={() => deleteBill(bill.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove Bill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default BillsView;
