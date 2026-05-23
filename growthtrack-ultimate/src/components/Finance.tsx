import React, { useState, useMemo, useCallback } from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2, Upload, LineChart as LineIcon, ListTodo } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import useStore, { selectFinance, selectAddTransaction, selectDeleteTransaction, selectAddBudget, selectDeleteBudget, apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import StatCard from './ui/StatCard';
import SIPCalculator from './SIPCalculator';
import EmptyState from './ui/EmptyState';
import OverviewTab from './finance/OverviewTab';
import AnalyticsTab from './finance/AnalyticsTab';
import TrendsTab from './finance/TrendsTab';
import BudgetingTab from './finance/BudgetingTab';
import SubscriptionsTab from './finance/SubscriptionsTab';
import SyncTab from './finance/SyncTab';


const CURRENCY = '₹';
const fmtINR = (n) => CURRENCY + Number(n).toLocaleString('en-IN');

const CATEGORIES = ['Gym', 'Supplements', 'Food', 'Apparel', 'Equipment', 'Salary', 'Stocks', 'Crypto', 'Rent', 'Utilities', 'Transport', 'Medical', 'Entertainment', 'Learning'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI (GPay/PhonePe)', 'Slice Card', 'Axio', 'HDFC Credit', 'SBI Debit'];
const COLORS = ['#10b981', '#f43f5e', '#0ea5e9', '#8b5cf6', '#e5a50a', '#ec4899', '#22d3ee', '#f97316', '#a78bfa', '#34d399'];
const TOOLTIP_STYLE = { background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-1)', backdropFilter: 'blur(12px)', fontSize: '0.82rem' };

const EMPTY_FORM = { type: 'Expense', category: '', amount: '', note: '', method: 'UPI (GPay/PhonePe)', date: new Date().toISOString().split('T')[0] };
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Build last N months as YYYY-MM strings
function lastNMonths(n = 6) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

// Aggregate transactions into monthly buckets for trend chart
function buildTrendData(transactions, months) {
  return months.map(month => {
    const txs = transactions.filter(t => t.date && t.date.startsWith(month));
    let income = 0, expenses = 0, investments = 0;
    txs.forEach(t => {
      if (t.type === 'Income') income += t.amount;
      else if (t.type === 'Expense') expenses += t.amount;
      else if (t.type === 'Investment') investments += t.amount;
    });
    return { month: month.slice(5), income, expenses, investments, savings: income - expenses - investments };
  });
}

// Day-of-month spend heatmap data for current month
function buildDayHeatmap(transactions, month) {
  const map = {};
  transactions.filter(t => t.date && t.date.startsWith(month) && t.type === 'Expense').forEach(t => {
    const day = parseInt(t.date.slice(8), 10);
    map[day] = (map[day] || 0) + t.amount;
  });
  const daysInMonth = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5)), 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: map[i + 1] || 0 }));
}

export default function Finance() {
  const { transactions, budgets = [] } = useStore(selectFinance);
  const addTransaction = useStore(selectAddTransaction);
  const deleteTransaction = useStore(selectDeleteTransaction);
  const addBudget = useStore(selectAddBudget);
  const deleteBudget = useStore(selectDeleteBudget);
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [budgetForm, setBudgetForm] = useState({ category: '', limit_amount: '' });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState('Overview');
  const [trendWindow, setTrendWindow] = useState(6);

  const subs = useStore(s => s.subscriptions);
  const addSubscription = useStore(s => s.addSubscription);
  const deleteSubscription = useStore(s => s.deleteSubscription);
  const [showAddSub, setShowAddSub] = useState(false);
  const [subForm, setSubForm] = useState({ name: '', cost: '', category: 'OTT', next_date: '', icon: '🍿', auto_renew: 1 });

  const [csvUploading, setCsvUploading] = useState(false);
  const [axioSyncing, setAxioSyncing] = useState(false);
  const [axioLastSync, setAxioLastSync] = useState(null);

  const filteredTransactions = useMemo(() =>
    transactions.filter(t => t.date && t.date.startsWith(selectedMonth)),
  [transactions, selectedMonth]);

  const { income, expenses, investments, balance, pieData, methodData } = useMemo(() => {
    let inc = 0, exp = 0, inv = 0;
    const catMap = {}, methodMap = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'Income') inc += t.amount;
      else if (t.type === 'Expense') {
        exp += t.amount;
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        methodMap[t.method || 'Unknown'] = (methodMap[t.method || 'Unknown'] || 0) + t.amount;
      }
      else if (t.type === 'Investment') inv += t.amount;
    });
    return {
      income: inc, expenses: exp, investments: inv, balance: inc - exp - inv,
      pieData: Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      methodData: Object.entries(methodMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
    };
  }, [filteredTransactions]);

  const statCards = useMemo(() => [
    { label: 'Net Monthly Balance', value: fmtINR(balance), icon: Wallet, color: balance >= 0 ? 'var(--success)' : 'var(--danger)' },
    { label: 'Total Income', value: '+' + fmtINR(income), icon: ArrowUpRight, color: 'var(--success)' },
    { label: 'Total Expenses', value: '-' + fmtINR(expenses), icon: ArrowDownRight, color: 'var(--danger)' },
    { label: 'Invested / Saved', value: fmtINR(investments), icon: TrendingUp, color: 'var(--info)' },
  ], [balance, income, expenses, investments]);

  // Multi-month trend data
  const trendMonths = useMemo(() => lastNMonths(trendWindow), [trendWindow]);
  const trendData = useMemo(() => buildTrendData(transactions, trendMonths), [transactions, trendMonths]);

  // Day heatmap data
  const dayHeatmapData = useMemo(() => buildDayHeatmap(transactions, selectedMonth), [transactions, selectedMonth]);
  const maxDaySpend = useMemo(() => Math.max(...dayHeatmapData.map(d => d.amount), 1), [dayHeatmapData]);

  // Savings rate
  const savingsRate = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : '0.0';

  // Budget breach alerts
  const budgetAlerts = useMemo(() => {
    return budgets.filter(b => {
      const actual = pieData.find(d => d.name === b.category)?.value || 0;
      return actual >= b.limit_amount * 0.8;
    }).map(b => {
      const actual = pieData.find(d => d.name === b.category)?.value || 0;
      return { ...b, actual, pct: Math.round((actual / b.limit_amount) * 100) };
    });
  }, [budgets, pieData]);

  const handleAdd = useCallback(() => {
    if (!form.category) return toast.error('Please select a category.');
    if (!form.method) return toast.error('Please select a payment method.');
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) return toast.error('Amount must be greater than ₹0.');
    addTransaction({ ...form, amount: amt, id: Date.now().toString() });
    setForm(EMPTY_FORM);
    toast.success(`${form.type} added successfully.`);
  }, [form, addTransaction, toast]);

  const handleDeleteTransaction = useCallback((id) => {
    const txToRestore = transactions.find(t => t.id === id);
    deleteTransaction(id);
    toast.info('Transaction deleted', 5000, {
      action: { label: 'Undo', onClick: () => { if (txToRestore) addTransaction(txToRestore); } }
    });
  }, [transactions, deleteTransaction, addTransaction, toast]);

  const handleDeleteBudget = useCallback((id) => {
    const bToRestore = budgets.find(t => t.id === id);
    deleteBudget(id);
    toast.info('Budget deleted', 5000, {
      action: { label: 'Undo', onClick: () => { if (bToRestore) addBudget(bToRestore); } }
    });
  }, [budgets, deleteBudget, addBudget, toast]);

  const handleDeleteSubscription = useCallback((id) => {
    const subToRestore = subs.find(t => t.id === id);
    deleteSubscription(id);
    toast.info('Subscription deleted', 5000, {
      action: { label: 'Undo', onClick: () => { if (subToRestore) addSubscription(subToRestore); } }
    });
  }, [subs, deleteSubscription, addSubscription, toast]);

  const handleCsvImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please upload a .csv file'); return; }
    setCsvUploading(true);
    try {
      const text = await file.text();
      const res = await apiSync('/finance/import/csv', 'POST', { content: text });
      toast.success(`Imported ${res?.imported || 0} transactions from CSV`);
    } catch { toast.error('CSV import failed'); }
    setCsvUploading(false);
    event.target.value = '';
  };

  const handleAxioSync = async () => {
    setAxioSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    setAxioLastSync(new Date().toLocaleTimeString());
    setAxioSyncing(false);
    toast.success('Axio sync complete — 0 new transactions (SMS parsing not yet live).');
  };

  const handleCsvExport = () => window.open(`${API_BASE}/api/finance/export`, '_blank');

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Wealth Engine</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Financial Command</h2>
          <p className="text-secondary">Track Axio, Slice, UPI, and bank flow month-to-month.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={handleCsvExport} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
            <ArrowDownRight size={14} style={{ marginRight: '6px' }} />CSV EXPORT
          </button>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="form-input" style={{ fontWeight: 800, color: 'var(--accent)', borderColor: 'var(--accent)' }} />
        </div>
      </div>

      {/* Budget breach alerts */}
      {budgetAlerts.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {budgetAlerts.map(b => (
            <div key={b.id} style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', background: b.pct >= 100 ? 'rgba(244,63,94,0.12)' : 'rgba(245,158,11,0.1)', border: `1px solid ${b.pct >= 100 ? 'rgba(244,63,94,0.4)' : 'rgba(245,158,11,0.4)'}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{b.pct >= 100 ? '🚨' : '⚠️'}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                {b.category}: {fmtINR(b.actual)} / {fmtINR(b.limit_amount)} ({b.pct}%)
                {b.pct >= 100 ? ' — BUDGET BREACHED' : ' — approaching limit'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {['Overview', 'Analytics', 'Trends', 'Budgeting', 'Subscriptions', 'Planning', 'Sync'].map(tab => (
          <button key={tab} className={`btn-sm ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)} style={{ padding: '0.6rem 1.5rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {tab === 'Overview' && <Wallet size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Analytics' && <BarChart2 size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Trends' && <LineIcon size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Budgeting' && <Activity size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Subscriptions' && <Calendar size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Planning' && <TrendingUp size={14} style={{ marginRight: '6px' }} />}
            {tab === 'Sync' && <CreditCard size={14} style={{ marginRight: '6px' }} />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && <OverviewTab {...{ statCards, savingsRate, methodData, COLORS, fmtINR, form, setForm, CATEGORIES, PAYMENT_METHODS, handleAdd, dayHeatmapData, maxDaySpend, filteredTransactions, handleDeleteTransaction, expenses }} />}
      {activeTab === 'Analytics' && <AnalyticsTab {...{ COLORS, fmtINR, form, pieData, TOOLTIP_STYLE, expenses }} />}
      {activeTab === 'Trends' && <TrendsTab {...{ fmtINR, form, TOOLTIP_STYLE, trendWindow, setTrendWindow, trendData, expenses }} />}
      {activeTab === 'Budgeting' && <BudgetingTab {...{ fmtINR, form, CATEGORIES, pieData, budgetForm, setBudgetForm, addBudget, budgets, expenses, renderBudgetRow, handleDeleteBudget }} />}
      {activeTab === 'Subscriptions' && <SubscriptionsTab {...{ fmtINR, form, showAddSub, setShowAddSub, subForm, setSubForm, addSubscription, subs, handleDeleteSubscription }} />}
      {activeTab === 'Planning' && <div className="fade-in"><SIPCalculator /></div>}
      {activeTab === 'Sync' && <SyncTab {...{  }} />}
    </div>
  );
}

function renderBudgetRow({ id, name, actual, limit, onDelete }) {
  const percent = Math.min((actual / limit) * 100, 100);
  const isOver = actual > limit;
  return (
    <div key={id || name} style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem', alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>{name}</span>
        <div className="flex-center">
          <span style={{ color: isOver ? 'var(--danger)' : 'var(--text-1)', fontWeight: 800 }}>{fmtINR(actual)}</span>
          <span style={{ color: 'var(--text-3)', margin: '0 4px' }}>/</span>
          <span>{fmtINR(limit)}</span>
          {onDelete && <button onClick={onDelete} className="btn-icon hover-text-danger" style={{ marginLeft: '8px', color: 'var(--text-3)', padding: '2px' }}><Trash2 size={12}/></button>}
        </div>
      </div>
      <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: isOver ? 'var(--danger)' : actual / limit >= 0.8 ? 'var(--warning)' : 'var(--success)', transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}
