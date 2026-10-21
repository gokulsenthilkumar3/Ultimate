'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { formatCurrency } from '@/packages/utils/validators';

interface CategorySpend {
    category: string;
    amount: number;
    color: string;
    percentage: number;
}

const CATEGORY_COLORS: { [key: string]: string } = {
    Food: '#ff6b9d',
    Shopping: 'var(--accent-orange)',
    Entertainment: 'var(--accent-pink)',
    Utilities: 'var(--accent)',
    Housing: 'var(--accent-green)',
    Travel: '#4bc0c0',
    Others: '#9966ff'
};

export default function AnalyticsPage() {
    const [totalExpense, setTotalExpense] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);
    const [categorySpend, setCategorySpend] = useState<CategorySpend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (!user) return;
            try {
                const q = query(collection(db, 'users', user.uid, 'transactions'));
                const snap = await getDocs(q);
                
                let incomeSum = 0;
                let expenseSum = 0;
                const catSumMap: { [key: string]: number } = {};

                snap.forEach((doc) => {
                    const data = doc.data();
                    const amt = Number(data.amount) || 0;
                    const type = data.type || 'debit';
                    const cat = data.category || 'Others';

                    if (type === 'credit') {
                        incomeSum += amt;
                    } else {
                        expenseSum += amt;
                        catSumMap[cat] = (catSumMap[cat] || 0) + amt;
                    }
                });

                // Prepare category items
                const list: CategorySpend[] = Object.keys(catSumMap).map(cat => {
                    const amt = catSumMap[cat];
                    const pct = expenseSum > 0 ? Math.round((amt / expenseSum) * 100) : 0;
                    return {
                        category: cat,
                        amount: amt,
                        color: CATEGORY_COLORS[cat] || '#8884d8',
                        percentage: pct
                    };
                }).sort((a, b) => b.amount - a.amount);

                setTotalExpense(expenseSum);
                setTotalIncome(incomeSum);
                setCategorySpend(list);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Calculating financial analytics…</div>
            </div>
        );
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Visual Insights</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Advanced breakdown of your cashflow and category spend</p>
            </div>

            {/* Cashflow summaries */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
                <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-green)' }}>
                    <div className="stat-card-label">Total Cash Inflow</div>
                    <div className="stat-card-value" style={{ color: 'var(--accent-green)' }}>{formatCurrency(totalIncome)}</div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #ff6b9d' }}>
                    <div className="stat-card-label">Total Cash Outflow</div>
                    <div className="stat-card-value" style={{ color: '#ff6b9d' }}>{formatCurrency(totalExpense)}</div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
                    <div className="stat-card-label">Savings Rate</div>
                    <div className="stat-card-value" style={{ color: 'var(--accent)' }}>
                        {savingsRate > 0 ? `${savingsRate}%` : '0%'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
                {/* Visual SVG chart */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card-header">
                        <div>
                            <div className="card-title">Category Breakdown</div>
                            <div className="card-subtitle">Visual share of total monthly expenses</div>
                        </div>
                    </div>

                    {categorySpend.length === 0 ? (
                        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                            No expense data logged to build visual chart
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '12px' }}>
                            {/* Graphical Chart bar */}
                            <div style={{ display: 'flex', height: '36px', borderRadius: '18px', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                {categorySpend.map((cs) => (
                                    <div 
                                        key={cs.category} 
                                        style={{ width: `${cs.percentage}%`, background: cs.color, height: '100%' }} 
                                        title={`${cs.category}: ${cs.percentage}%`}
                                    />
                                ))}
                            </div>

                            {/* Legend details */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                {categorySpend.map((cs) => (
                                    <div key={cs.category} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: cs.color }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{cs.category}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {formatCurrency(cs.amount)} ({cs.percentage}%)
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Analytics Card */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Cashflow Quotient</div>
                            <div className="card-subtitle">Ratio analysis</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                <span>Expense-to-Income Ratio</span>
                                <span style={{ fontWeight: 600 }}>
                                    {totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0}%
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{ 
                                        width: `${Math.min(100, totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0)}%`, 
                                        background: '#ff6b9d' 
                                    }} 
                                />
                            </div>
                        </div>

                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                            <h5 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>💡 Health Advice</h5>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                                {savingsRate >= 20 
                                    ? 'Excellent savings rate! You are actively hitting your wealth creation targets. Keep investing consistently.'
                                    : 'Your savings rate is below the recommended 20% limit. Try restricting your wants to scale up savings.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
