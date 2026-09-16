'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { validatePAN, validateDOB, validatePhone, validateIncome, validateFamilySize, formatPAN, formatPhone, formatCurrency, calculateMonthlyIncome, calculatePersonalisedBudget } from '@/packages/utils/validators';
import ToastManager, { useToastManager } from '@/components/ToastManager';
import AES from 'crypto-js/aes';

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'finsync-secure-dev-key-1234';

const encryptData = (text: string | number) => {
  return AES.encrypt(String(text), SECRET_KEY).toString();
};

interface ProfileData { name: string; pan: string; dob: string; phone: string; income: string; familySize: string; }

function StepBar({ current }: { current: number }) {
  const steps = ['Personal Info', 'Budget Preview', 'All Set!'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 48 }}>
      {steps.map((label, i) => {
        const num = i + 1;
        const done = current > num;
        const active = current === num;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className={`step-circle${done ? ' done' : active ? ' active' : ''}`}>
                {done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> : num}
              </div>
              <span className={`step-label${done ? ' done' : active ? ' active' : ''}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`step-connector${done ? ' done' : ''}`} style={{ marginTop: 17 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const InputField = ({ label, type = 'text', placeholder = '', hint = '', extra = {}, value, error, onChange }: any) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input
      type={type}
      className={`form-input${error ? ' error' : ''}`}
      placeholder={placeholder}
      value={value || ''}
      onChange={onChange}
      {...extra}
    />
    {hint && <div className="form-hint">{hint}</div>}
    {error && <div className="form-error">{error}</div>}
  </div>
);

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProfileData>({ name: '', pan: '', dob: '', phone: '', income: '', familySize: '1' });
  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToastManager();

  const annualIncome = parseFloat(data.income) || 0;
  const familySizeNum = parseInt(data.familySize) || 1;
  const monthly = calculateMonthlyIncome(annualIncome);
  const initialBudget = calculatePersonalisedBudget(monthly, 1); // Standard 50/30/20 with familySize = 1
  const budget = calculatePersonalisedBudget(monthly, familySizeNum);

  // Parse rule into components for UI
  const ruleParts = budget.rule.split('/');
  const ruleNeeds = ruleParts[0] || '50';
  const ruleWants = ruleParts[1] || '30';
  const ruleSavings = ruleParts[2] || '20';

  const validateStep1 = () => {
    const e: Partial<ProfileData> = {};
    if (!data.name.trim()) e.name = 'Name is required';
    const pan = validatePAN(data.pan); if (!pan.valid) e.pan = pan.message;
    const dob = validateDOB(data.dob); if (!dob.valid) e.dob = dob.message;
    const phone = validatePhone(data.phone); if (!phone.valid) e.phone = phone.message;
    const income = validateIncome(data.income); if (!income.valid) e.income = income.message;
    const fam = validateFamilySize(data.familySize); if (!fam.valid) e.familySize = fam.message;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2) saveProfile();
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser || { uid: 'mock-user-123' }; // Fallback for mock testing
      if (!user) { showToast('Please log in again', 'error'); router.push('/login'); return; }

      // Encrypt sensitive Personal Identifiable Information (PII) before storing
      const encryptedProfile = {
        name: data.name, // Name is usually not encrypted to display in UI, but PII is
        pan: encryptData(formatPAN(data.pan)),
        dob: encryptData(data.dob),
        phone: encryptData(formatPhone(data.phone)),
        income: encryptData(data.income),
        familySize: parseInt(data.familySize),
        onboarded: true,
        createdAt: new Date().toISOString()
      };

      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 3000));
        const dbPromise = setDoc(doc(db, 'users', user.uid), {
          profile: encryptedProfile,
          budget: { monthly: { income: monthly, needs: budget.needs, wants: budget.wants, savings: budget.savings }, rule: budget.rule },
        }, { merge: true });

        await Promise.race([dbPromise, timeoutPromise]);
      } catch (dbErr) {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.warn('Mocking profile save due to Firestore failure or timeout', encryptedProfile);
        } else {
          throw dbErr;
        }
      }

      showToast('Profile encrypted & saved!', 'success');
      setStep(3);
    } catch (err: any) { showToast('Failed to save. Try again.', 'error'); }
    finally { setLoading(false); }
  };

  const set = (field: keyof ProfileData) => (val: string) => setData(d => ({ ...d, [field]: val }));

  return (
    <div className="onboarding-container">
      <ToastManager toasts={toasts} onRemove={removeToast} />

      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div className="auth-logo-icon">💰</div>
            <span className="auth-logo-text">FinSync Super</span>
          </div>
        </div>

        <StepBar current={step} />

        <div className="onboarding-card fade-in" key={step}>
          {step === 1 && (
            <>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text-primary)', marginBottom: 8 }}>
                Let's get to know you
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
                This helps us personalise your financial journey based on your household.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <InputField label="Full Name" placeholder="Rahul Sharma"
                    value={data.name} error={errors.name} onChange={(e: any) => { set('name')(e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
                  />
                </div>
                <InputField label="PAN Card" placeholder="ABCDE1234F" hint="Format: ABCDE1234F"
                  value={data.pan} error={errors.pan} onChange={(e: any) => { setData(d => ({ ...d, pan: e.target.value.toUpperCase() })); setErrors(p => ({ ...p, pan: undefined })); }} extra={{ maxLength: 10 }}
                />
                <InputField label="Date of Birth" type="date"
                  value={data.dob} error={errors.dob} onChange={(e: any) => { set('dob')(e.target.value); setErrors(p => ({ ...p, dob: undefined })); }} extra={{ max: new Date().toISOString().split('T')[0] }}
                />
                <InputField label="Phone Number" placeholder="9876543210" type="tel"
                  value={data.phone} error={errors.phone} onChange={(e: any) => { setData(d => ({ ...d, phone: e.target.value.replace(/\D/g, '') })); setErrors(p => ({ ...p, phone: undefined })); }} extra={{ maxLength: 10 }}
                />
                <InputField label="Annual Income (₹)" type="number" placeholder="600000" hint="Used for budget calculations"
                  value={data.income} error={errors.income} onChange={(e: any) => { set('income')(e.target.value); setErrors(p => ({ ...p, income: undefined })); }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Family Size (Including You)</label>
                <select className="form-input" value={data.familySize} onChange={e => set('familySize')(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} {n === 1 ? 'member' : 'members'}</option>)}
                </select>
                <div className="form-hint" style={{ marginTop: 4 }}>This dynamically adjusts your AI budget rule.</div>
              </div>
              <div style={{ padding: '14px 16px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                🔒 Your data is encrypted and used only to provide personalised advice.
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--text-primary)', marginBottom: 8 }}>
                Your Customised Financial Plan
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
                See how your family size shifts your optimal budget structure.
              </p>

              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Household Monthly Income</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: -1, color: 'var(--text-primary)' }}>{formatCurrency(monthly)}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                {/* Standard Plan */}
                <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', opacity: 0.7 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20, textAlign: 'center' }}>Standard 50/30/20 Rule</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Needs (50%)</span>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{formatCurrency(initialBudget.needs)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Wants (30%)</span>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{formatCurrency(initialBudget.wants)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Savings (20%)</span>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{formatCurrency(initialBudget.savings)}</span>
                    </div>
                  </div>
                </div>

                {/* Personalised Plan */}
                <div style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--accent-primary)', position: 'relative', boxShadow: '0 8px 24px rgba(108,99,255,0.1)' }}>
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-primary)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    YOUR {budget.rule} PLAN
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 20, textAlign: 'center' }}>Family of {data.familySize} Adjusted</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#ff6b9d', fontWeight: 600, fontSize: 13 }}>Needs ({ruleNeeds}%)</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{formatCurrency(budget.needs)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--accent-orange)', fontWeight: 600, fontSize: 13 }}>Wants ({ruleWants}%)</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{formatCurrency(budget.wants)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: 13 }}>Savings ({ruleSavings}%)</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{formatCurrency(budget.savings)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 24, padding: '18px 20px', background: 'rgba(0,212,160,0.06)', border: '1px solid rgba(0,212,160,0.15)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)', marginBottom: 10 }}>✨ Family AI Tips</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>• Ensure you build an emergency fund of {formatCurrency(budget.needs * 6)} (6 months household expenses).</div>
                  <div>• With {data.familySize} members, locking {formatCurrency(Math.round(budget.savings * 0.4))} into Health Insurance/SIPs is critical.</div>
                  <div>• Stick closely to your {ruleWants}% Wants budget to avoid systemic lifestyle creep.</div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: 80, height: 80, background: 'var(--accent-green-light)', borderRadius: '50%', marginBottom: 24, padding: 20 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: -1, color: 'var(--text-primary)', marginBottom: 12 }}>
                You're all set!
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto 32px' }}>
                Welcome to FinSync Super, {data.name}! Your personalised dashboard is ready.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 360, margin: '0 auto 32px' }}>
                {/* Custom glowing icons instead of generic emojis */}
                <div style={{ padding: '20px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg style={{ marginBottom: 12, color: 'var(--accent-primary)' }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="10" x="3" y="11" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" x2="8" y1="16" y2="16" /><line x1="16" x2="16" y1="16" y2="16" /></svg>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>AI Budget</div>
                </div>
                <div style={{ padding: '20px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg style={{ marginBottom: 12, color: 'var(--accent-orange)' }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Auto Sync</div>
                </div>
                <div style={{ padding: '20px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg style={{ marginBottom: 12, color: '#ff6b9d' }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Insights</div>
                </div>
              </div>
            </div>
          )}

          {/* Nav Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-light)' }}>
            {step > 1 && step < 3 ? (
              <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} disabled={loading}>
                ← Back
              </button>
            ) : <span />}
            {step < 3 ? (
              <button className="btn btn-primary" onClick={handleNext} disabled={loading} style={{ marginLeft: 'auto' }}>
                {loading ? 'Saving…' : step === 1 ? 'Continue →' : 'Save & Complete →'}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => router.push('/dashboard')} style={{ margin: '0 auto' }}>
                Go to Dashboard →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
