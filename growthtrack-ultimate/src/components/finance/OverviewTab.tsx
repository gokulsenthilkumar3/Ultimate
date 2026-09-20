import React from 'react';
import { Wallet, Plus, Trash2, CreditCard, PiggyBank, Search, X } from 'lucide-react';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';


export default function OverviewTab({ statCards, savingsRate, methodData, COLORS, fmtINR, currencySymbol, form, setForm, CATEGORIES, PAYMENT_METHODS, handleAdd, dayHeatmapData, maxDaySpend, filteredTransactions, selectedCategory, onClearCategory, handleDeleteTransaction, expenses, selectedMonth, ledgerQuery, setLedgerQuery, ledgerPage, setLedgerPage }) {
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const page = Math.min(ledgerPage, pageCount);
  const pagedTransactions = [...filteredTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice((page - 1) * pageSize, page * pageSize);
  const [year, month] = selectedMonth.split('-').map(Number);
  const calendarOffset = new Date(year, month - 1, 1).getDay();
  {/* ── OVERVIEW ── */}
      return (
    <>
          <div className="stats-grid finance-kpi-grid mb-lg">
            {statCards.map((c) => <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />)}
          </div>

          {/* Savings Rate pill */}
          <div className="finance-overview-savings-rate-container">
            <div className={`finance-overview-savings-rate ${parseFloat(savingsRate) >= 20 ? 'finance-savings-good' : parseFloat(savingsRate) >= 0 ? 'finance-savings-warn' : 'finance-savings-danger'}`}>
              <span>
                <PiggyBank size={16} aria-hidden="true" /> Savings rate: {savingsRate}%
                <small>{parseFloat(savingsRate) >= 30 ? 'Excellent' : parseFloat(savingsRate) >= 20 ? 'On track' : parseFloat(savingsRate) >= 0 ? 'Below 20% target' : 'Overspending'}</small>
              </span>
            </div>
          </div>

          <div className="dual-grid mb-lg">
            <div className="glass-card">
              <div className="card-header-row finance-overview-card-header">
                <CreditCard size={18} color="var(--accent)" />
                <span className="card-title finance-overview-card-title">Spending by Method</span>
              </div>
              <div className="finance-overview-spending-list">
                {methodData.length === 0
                  ? <EmptyState icon={CreditCard as any} title="No Spends" description="No expense data recorded for this month yet." />
                  : methodData.map((d, i) => {
                    const barStyle = { width: `${(d.value / expenses) * 100}%`, background: COLORS[i % COLORS.length] };
                    return (
                    <div key={d.name}>
                      <div className="finance-overview-spending-item-header">
                        <span className="finance-overview-spending-item-name">{d.name}</span>
                        <span className="finance-overview-spending-item-value">{fmtINR(d.value)}</span>
                      </div>
                      <div className="finance-overview-spending-bar-container">
                        <div className="finance-overview-spending-bar" ref={el => { if (el) { el.style.width = `${(d.value / expenses) * 100}%`; el.style.background = COLORS[i % COLORS.length]; } }} />
                      </div>
                    </div>
                  )})}
              </div>
            </div>

            <div className="glass-card">
              <span className="card-title">New Log</span>
              <div className="form-stack mt-sm">
                <div className="btn-group">
                  {['Expense', 'Income', 'Investment'].map((type) => (
                    <button key={type} onClick={() => setForm({ ...form, type })} className={`finance-overview-type-btn ${form.type === type ? 'btn-primary' : 'btn-ghost'}`}>{type}</button>
                  ))}
                </div>
                <div className="finance-overview-form-grid">
                  <label className="finance-field"><span>Category</span><select aria-label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="form-input">
                    <option value="">Category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></label>
                  <label className="finance-field"><span>Payment method</span><select aria-label="Payment method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="form-input">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select></label>
                </div>
                <div className="finance-overview-form-grid">
                  <label className="finance-field"><span>Date</span><input type="date" aria-label="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" /></label>
                  <label className="finance-field"><span>Amount ({currencySymbol})</span><input type="number" placeholder="0.00" aria-label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="form-input" min="0" /></label>
                </div>
                <label className="finance-field"><span>Description</span><input type="text" placeholder="Optional note" aria-label="Description" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="form-input" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} /></label>
                <button onClick={handleAdd} className="btn-primary btn-full"><Plus size={16} /> Add transaction</button>
              </div>
            </div>
          </div>

          {/* Day Spend Heatmap */}
          <div className="glass-card mb-lg">
            <span className="card-title">Spending calendar — {selectedMonth}</span>
            <p className="finance-overview-heatmap-subtitle">A calendar view of daily expenses. Darker days indicate higher spending.</p>
            <div className="finance-calendar-weekdays" aria-hidden="true">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <span key={day}>{day}</span>)}</div>
            <div className="finance-overview-heatmap-grid" role="grid" aria-label={`Daily spending for ${selectedMonth}`}>
              {Array.from({ length: calendarOffset }, (_, index) => <span key={`blank-${index}`} className="finance-calendar-blank" aria-hidden="true" />)}
              {dayHeatmapData.map(d => {
                const intensity = d.amount / maxDaySpend;
                return (
                  <div key={d.day} role="gridcell" aria-label={`${selectedMonth}-${String(d.day).padStart(2, '0')}: ${fmtINR(d.amount)}`} title={`Day ${d.day}: ${fmtINR(d.amount)}`} className="finance-overview-heatmap-cell" ref={el => { if (el) { el.style.background = d.amount === 0 ? 'var(--bg-elevated)' : `rgba(244,63,94,${0.15 + intensity * 0.75})`; el.style.color = intensity > 0.5 ? '#fff' : 'var(--text-2)'; } }}>
                    <strong>{d.day}</strong>{d.amount > 0 && <small>{fmtINR(d.amount)}</small>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header-row finance-overview-card-header">
              <div><span className="card-title">Transactions</span><p className="finance-ledger-count">{filteredTransactions.length} result{filteredTransactions.length === 1 ? '' : 's'} · {selectedMonth}</p></div>
              {selectedCategory && (
                <button type="button" className="btn-sm" onClick={onClearCategory} aria-label="Clear category filter">
                  {selectedCategory} · Clear
                </button>
              )}
            </div>
            <div className="finance-ledger-toolbar"><label><Search size={16} /><input type="search" value={ledgerQuery} onChange={(e) => setLedgerQuery(e.target.value)} placeholder="Search category, note, method…" aria-label="Search transactions" />{ledgerQuery && <button type="button" aria-label="Clear transaction search" onClick={() => setLedgerQuery('')}><X size={15} /></button>}</label></div>
            {filteredTransactions.length > 0 && <div className="finance-overview-ledger-head" aria-hidden="true"><span>Date</span><span>Transaction</span><span>Method</span><span>Amount</span><span /></div>}
            <div className="item-list mt-sm">
              {filteredTransactions.length === 0 && (
                <EmptyState 
                  icon={Wallet as any}
                  title="No Transactions" 
                  description={ledgerQuery ? `No transactions match “${ledgerQuery}”. Try another search or clear the filter.` : 'No transactions found for this month. Start by adding a new transaction.'} 
                />
              )}
              {pagedTransactions.map((tx) => (
                <div key={tx.id} className="list-row finance-overview-ledger-row">
                  <div className="finance-overview-ledger-date">{tx.date}</div>
                  <div>
                    <p className="finance-overview-ledger-category">{tx.category}</p>
                    <p className="finance-overview-ledger-note">{tx.note}</p>
                  </div>
                  <div className="finance-overview-ledger-method"><CreditCard size={14} /> {tx.method}</div>
                  <div className={`finance-overview-ledger-amount ${tx.type === 'Income' ? 'finance-text-income' : tx.type === 'Expense' ? 'finance-text-expense' : 'finance-text-invest'}`}>
                    {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}{fmtINR(tx.amount)}
                  </div>
                  <button title="Delete transaction" aria-label="Delete transaction" onClick={() => handleDeleteTransaction(tx.id)} className="btn-icon btn-icon--danger finance-overview-ledger-delete"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            {filteredTransactions.length > pageSize && <nav className="finance-pagination" aria-label="Transaction pages"><button disabled={page <= 1} onClick={() => setLedgerPage(page - 1)}>Previous</button><span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredTransactions.length)} of {filteredTransactions.length}</span><button disabled={page >= pageCount} onClick={() => setLedgerPage(page + 1)}>Next</button></nav>}
          </div>
        </>
  );
}
