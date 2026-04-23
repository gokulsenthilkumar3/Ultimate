import React, { useState } from 'react';
import { DollarSign, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2 } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const Finance = () => {
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'Expense', category: 'Gym', amount: 80, date: '2026-04-20', note: 'Monthly membership' },
    { id: 2, type: 'Expense', category: 'Supplements', amount: 120, date: '2026-04-21', note: 'Protein & Creatine' },
    { id: 3, type: 'Income', category: 'Salary', amount: 4500, date: '2026-04-01', note: 'Monthly pay' },
    { id: 4, type: 'Investment', category: 'Stocks', amount: 500, date: '2026-04-15', note: 'S&P 500 Index' }
  ]);

  const [newTx, setNewTx] = useState({ type: 'Expense', category: '', amount: 0, note: '' });

  const categories = ['Gym', 'Supplements', 'Food', 'Apparel', 'Equipment', 'Salary', 'Stocks', 'Crypto', 'Rent', 'Utilities'];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const income = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
  const investments = transactions.filter(t => t.type === 'Investment').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses - investments;

  const chartData = [
    { name: 'Income', value: income },
    { name: 'Expenses', value: expenses },
    { name: 'Investments', value: investments }
  ].filter(d => d.value > 0);

  const addTransaction = () => {
    if (newTx.category && newTx.amount > 0) {
      setTransactions([...transactions, { ...newTx, id: Date.now(), date: new Date().toISOString().split('T')[0] }]);
      setNewTx({ type: 'Expense', category: '', amount: 0, note: '' });
    }
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', marginBottom: '10px' }}>
          <DollarSign size={28} color="#3b82f6" />
          Finance Dashboard
        </h2>
        <p style={{ color: '#94a3b8' }}>Manage your budget, income, and expenses</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Wallet size={16} /> Total Balance
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: balance >= 0 ? '#10b981' : '#ef4444' }}>${balance.toLocaleString()}</p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ArrowUpRight size={16} color="#10b981" /> Income
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>+${income.toLocaleString()}</p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ArrowDownRight size={16} color="#ef4444" /> Expenses
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>-${expenses.toLocaleString()}</p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <TrendingUp size={16} color="#3b82f6" /> Investments
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>${investments.toLocaleString()}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', marginBottom: '30px' }}>
        {/* Visualization */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PieChart size={20} /> Allocation
          </h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: 'white' }}
                  itemStyle={{ color: 'white' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px', flexWrap: 'wrap' }}>
            {chartData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: colors[i % colors.length] }} />
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add Transaction */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Add Transaction</h3>
          <div style={{ display: 'grid', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['Expense', 'Income', 'Investment'].map(type => (
                <button
                  key={type}
                  onClick={() => setNewTx({ ...newTx, type })}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                    background: newTx.type === type ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                    color: 'white', cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            <select
              value={newTx.category}
              onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={newTx.amount || ''}
              onChange={(e) => setNewTx({ ...newTx, amount: parseFloat(e.target.value) || 0 })}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={newTx.note}
              onChange={(e) => setNewTx({ ...newTx, note: e.target.value })}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
            />
            <button
              onClick={addTransaction}
              style={{
                padding: '12px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}
            >
              <Plus size={18} /> Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Recent History</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          {[...transactions].reverse().map(tx => (
            <div key={tx.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '15px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: '600' }}>{tx.category}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{tx.date} • {tx.note}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ 
                  fontWeight: 'bold',
                  color: tx.type === 'Income' ? '#10b981' : tx.type === 'Expense' ? '#ef4444' : '#3b82f6'
                }}>
                  {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}${tx.amount.toLocaleString()}
                </span>
                <button
                  onClick={() => deleteTransaction(tx.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Finance;
