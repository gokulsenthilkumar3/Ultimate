'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { formatCurrency } from '@/packages/utils/validators';

export default function BudgetPage() {
    const [income, setIncome] = useState('');
    const [rule, setRule] = useState('50/30/20');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (!user) return;
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                const data = snap.data();
                if (data?.budget?.monthly?.income) {
                    setIncome(data.budget.monthly.income.toString());
                    setRule(data.budget.rule || '50/30/20');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, []);

    const ruleParts = rule.split('/');
    const needPct = Number(ruleParts[0]) || 50;
    const wantPct = Number(ruleParts[1]) || 30;
    const savePct = Number(ruleParts[2]) || 20;

    const incomeVal = Number(income) || 0;
    const calculatedNeeds = Math.round(incomeVal * (needPct / 100));
    const calculatedWants = Math.round(incomeVal * (wantPct / 100));
    const calculatedSavings = Math.round(incomeVal * (savePct / 100));

    const handleSaveBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user || !income) return;

        setSaving(true);
        setMessage('');

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                budget: {
                    rule,
                    monthly: {
                        income: incomeVal,
                        needs: calculatedNeeds,
                        wants: calculatedWants,
                        savings: calculatedSavings
                    }
                }
            });
            setMessage('✓ Budget plan updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error(err);
            setMessage('✗ Error saving budget plan.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading budget framework…</div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Personal CFO Budget Planner</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Configure your monthly income and rule allocation thresholds</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 28 }}>
                {/* Form configuration */}
                <form onSubmit={handleSaveBudget} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Monthly Base Income (₹)</label>
                        <input 
                            type="number" 
                            required 
                            value={income} 
                            onChange={(e) => setIncome(e.target.value)}
                            placeholder="e.g. 60000"
                            style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', fontSize: 14 }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Budget Rule Allocation</label>
                        <select 
                            value={rule} 
                            onChange={(e) => setRule(e.target.value)}
                            style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', fontSize: 14 }}
                        >
                            <option value="50/30/20">50/30/20 Rule (Standard)</option>
                            <option value="70/20/10">70/20/10 Rule (High Living Cost)</option>
                            <option value="40/40/20">40/40/20 Rule (Balanced-High Spend)</option>
                            <option value="60/20/20">60/20/20 Rule (Heavy Needs)</option>
                        </select>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: 8 }} disabled={saving}>
                        {saving ? 'Updating...' : 'Save Plan'}
                    </button>

                    {message && (
                        <div style={{ 
                            fontSize: 13, 
                            fontWeight: 600, 
                            color: message.startsWith('✓') ? 'var(--accent-green)' : 'var(--error)', 
                            textAlign: 'center', 
                            marginTop: 4 
                        }}>
                            {message}
                        </div>
                    )}
                </form>

                {/* Calculation view card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Allocation Breakdown</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        <div style={{ padding: '16px', background: 'rgba(255,107,157,0.05)', border: '1px solid rgba(255,107,157,0.1)', borderRadius: '12px' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Needs ({needPct}%)</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#ff6b9d' }}>{formatCurrency(calculatedNeeds)}</div>
                        </div>

                        <div style={{ padding: '16px', background: 'rgba(255,159,67,0.05)', border: '1px solid rgba(255,159,67,0.1)', borderRadius: '12px' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Wants ({wantPct}%)</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-orange)' }}>{formatCurrency(calculatedWants)}</div>
                        </div>

                        <div style={{ padding: '16px', background: 'rgba(0,212,160,0.05)', border: '1px solid rgba(0,212,160,0.1)', borderRadius: '12px' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Savings ({savePct}%)</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-green)' }}>{formatCurrency(calculatedSavings)}</div>
                        </div>
                    </div>

                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--text-primary)' }}>💡 About the {rule} Rule</p>
                        {rule === '50/30/20' ? (
                            'The classic 50/30/20 rule advises allocating 50% of your net income to Needs (essential housing, groceries, bills), 30% to Wants (dining, hobbies, subscriptions), and 20% directly to Savings and investments.'
                        ) : (
                            'This custom allocation alters your thresholds to suit your current local financial circumstances, ensuring you keep track of every category correctly.'
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
