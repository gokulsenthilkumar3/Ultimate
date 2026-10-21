'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { formatCurrency } from '@/packages/utils/validators';

interface Transaction {
    id: string;
    name: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    date: Date;
    icon: string;
}

const CATEGORY_ICONS: { [key: string]: string } = {
    Food: '🍔',
    Shopping: '📦',
    Salary: '💵',
    Income: '💵',
    Entertainment: '🎬',
    Utilities: '⚡',
    Housing: '🏠',
    Travel: '🚗',
    Others: '💰'
};

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    // Form fields
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'credit' | 'debit'>('debit');
    const [category, setCategory] = useState('Food');
    const [submitting, setSubmitting] = useState(false);

    // Filters
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterType, setFilterType] = useState('All');

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (!user) return;

            const q = query(
                collection(db, 'users', user.uid, 'transactions'),
                orderBy('date', 'desc')
            );

            const unsubSnap = onSnapshot(q, (snap) => {
                const txList: Transaction[] = [];
                snap.forEach((doc) => {
                    const data = doc.data();
                    txList.push({
                        id: doc.id,
                        name: data.name || 'Untitled',
                        amount: Number(data.amount) || 0,
                        type: data.type || 'debit',
                        category: data.category || 'Others',
                        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
                        icon: CATEGORY_ICONS[data.category] || '💰'
                    });
                });
                setTransactions(txList);
                setLoading(false);
            }, () => {
                setLoading(false);
            });

            return () => unsubSnap();
        });

        return () => unsubAuth();
    }, []);

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user || !name || !amount) return;

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'users', user.uid, 'transactions'), {
                name,
                amount: Math.abs(Number(amount)),
                type,
                category,
                date: Timestamp.now()
            });

            // Reset form
            setName('');
            setAmount('');
            setType('debit');
            setCategory('Food');
            setShowModal(false);
        } catch (err) {
            console.error('Error adding transaction: ', err);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        const matchCategory = filterCategory === 'All' || tx.category === filterCategory;
        const matchType = filterType === 'All' || tx.type === filterType;
        return matchCategory && matchType;
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading transactions…</div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Transaction Ledger</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>View and manage all income and expense logs</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Add Transaction
                </button>
            </div>

            {/* Filters bar */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Filter Category</label>
                    <select 
                        value={filterCategory} 
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                        <option value="All">All Categories</option>
                        <option value="Food">Food</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Salary">Salary/Income</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Housing">Housing</option>
                        <option value="Travel">Travel</option>
                        <option value="Others">Others</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Filter Type</label>
                    <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                        <option value="All">All Types</option>
                        <option value="debit">Expenses (Debit)</option>
                        <option value="credit">Income (Credit)</option>
                    </select>
                </div>
            </div>

            {/* Ledger content */}
            <div className="card" style={{ padding: 0 }}>
                {filteredTransactions.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                        <p style={{ fontSize: 14 }}>No transactions found matching your filters.</p>
                    </div>
                ) : (
                    filteredTransactions.map((tx) => (
                        <div key={tx.id} className="transaction-item" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                            <div className="transaction-icon" style={{ background: 'var(--bg-secondary)' }}>
                                <span style={{ fontSize: 18 }}>{tx.icon}</span>
                            </div>
                            <div className="transaction-info">
                                <div className="transaction-name">{tx.name}</div>
                                <div className="transaction-date">
                                    {tx.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · <span style={{ color: 'var(--text-muted)' }}>{tx.category}</span>
                                </div>
                            </div>
                            <div className={`transaction-amount ${tx.type === 'debit' ? 'debit' : 'credit'}`}>
                                {tx.type === 'debit' ? '-' : '+'}{formatCurrency(tx.amount)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Transaction Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <form onSubmit={handleAddTransaction} className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: 16, padding: '28px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h4 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Add New Log</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Name / Description</label>
                            <input 
                                type="text" 
                                required 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Swiggy, Amazon, Salary, etc." 
                                style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Amount (₹)</label>
                            <input 
                                type="number" 
                                required 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g. 500" 
                                style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Type</label>
                                <select 
                                    value={type} 
                                    onChange={(e) => setType(e.target.value as 'credit' | 'debit')}
                                    style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                                >
                                    <option value="debit">Debit (Expense)</option>
                                    <option value="credit">Credit (Income)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
                                <select 
                                    value={category} 
                                    onChange={(e) => setCategory(e.target.value)}
                                    style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                                >
                                    <option value="Food">Food</option>
                                    <option value="Shopping">Shopping</option>
                                    <option value="Salary">Salary/Income</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Housing">Housing</option>
                                    <option value="Travel">Travel</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                                {submitting ? 'Adding...' : 'Save Log'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
