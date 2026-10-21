import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Plus,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    deleteTransaction,
    setIsAddTransactionOpen,
    formatMoney,
    preferences,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'bill'>('all');

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());

      const matchFilter =
        filter === 'all' ||
        (filter === 'income' && t.amount > 0) ||
        (filter === 'expense' && t.amount < 0 && t.type !== 'bill') ||
        (filter === 'bill' && t.type === 'bill');

      return matchSearch && matchFilter;
    });
  }, [transactions, search, filter]);

  const totalIn = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalOut = transactions
    .filter((t) => t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const exportCSV = () => {
    const headers = ['ID', 'Date', 'Description', 'Category', 'Amount', 'Type', 'Status'];
    const rows = filtered.map((t) => [
      t.id,
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.amount,
      t.type,
      t.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finsync-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── Header row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Ledger & Activity</h2>
          <p className="text-xs text-white/50">
            Real-time cashflow records and categorized transaction history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="glass-button-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => setIsAddTransactionOpen(true)}
            className="glass-button px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Transaction
          </button>
        </div>
      </div>

      {/* ── Stat overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">
            Total Inflow
          </span>
          <p className="text-xl font-extrabold text-emerald-400 font-mono">
            +{formatMoney(totalIn)}
          </p>
        </div>
        <div className="stat-card">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">
            Total Outflow
          </span>
          <p className="text-xl font-extrabold text-rose-400 font-mono">
            -{formatMoney(totalOut)}
          </p>
        </div>
        <div className="stat-card">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">
            Net Difference
          </span>
          <p className={`text-xl font-extrabold font-mono ${totalIn >= totalOut ? 'text-blue-400' : 'text-amber-400'}`}>
            {totalIn >= totalOut ? '+' : ''}{formatMoney(totalIn - totalOut)}
          </p>
        </div>
      </div>

      {/* ── Search & Filter Tabs ── */}
      <div className="card-swiss p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by merchant, note, or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['all', 'income', 'expense', 'bill'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                filter === t
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Transactions Ledger Table ── */}
      <div className="card-swiss overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-white/40 space-y-2">
            <Filter size={24} className="mx-auto text-white/20" />
            <p className="text-sm">No transactions match your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase font-bold tracking-wider text-white/40 bg-white/[0.01]">
                  <th className="py-3 px-4">Transaction / Merchant</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {filtered.map((t) => {
                  const isCredit = t.amount > 0;
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm shrink-0">
                            {t.icon || '💳'}
                          </span>
                          <div>
                            <p className="font-semibold text-white">{t.description}</p>
                            <span className="text-[10px] text-white/40 uppercase">{t.type}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="badge badge-blue">{t.category}</span>
                      </td>
                      <td className="py-3.5 px-4 text-white/60 font-mono text-[11px]">
                        {t.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="badge badge-emerald">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className={isCredit ? 'text-emerald-400' : 'text-white'}>
                          {isCredit ? '+' : '-'}{formatMoney(Math.abs(t.amount))}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          className="p-1.5 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default TransactionsView;
