import React, { useState } from 'react';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { Check, Zap, Star, AlertCircle, ArrowRight } from 'lucide-react';
import { AUTH_API_BASE } from '../constants';

export default function Pricing() {
  const user = useStore(state => state.user);
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const isPro = user?.subscriptionTier === 'pro';

  const handleUpgrade = async () => {
    if (!user || !user.id) {
      toast.error('Please log in to upgrade.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error connecting to payment provider');
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="text-display" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          Level Up Your <span className="text-accent">Journey</span>
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Unlock the full potential of GrowthTrack Ultimate. Go Pro to access advanced AI insights, unlimited device syncing, and predictive forecasting.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* FREE TIER */}
        <div className="glass-card" style={{ 
          flex: '1 1 300px', maxWidth: '400px', padding: '2.5rem 2rem',
          display: 'flex', flexDirection: 'column',
          border: isPro ? '1px solid var(--border)' : '1px solid var(--accent)'
        }}>
          <h3 className="text-display" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Free</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem' }}>$0<span style={{ fontSize: '1rem', color: 'var(--text-3)' }}>/mo</span></div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-2)' }}><Check size={18} color="var(--accent)" /> Basic Metrics Logging</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-2)' }}><Check size={18} color="var(--accent)" /> 3D Avatar Viewer</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-2)' }}><Check size={18} color="var(--accent)" /> Goal Tracking</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-2)' }}><Check size={18} color="var(--accent)" /> 2 Device Syncs</li>
          </ul>

          <button className="btn-secondary" disabled style={{ width: '100%', padding: '14px' }}>
            {isPro ? 'Included' : 'Current Plan'}
          </button>
        </div>

        {/* PRO TIER */}
        <div className="glass-card" style={{ 
          flex: '1 1 300px', maxWidth: '400px', padding: '2.5rem 2rem',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(145deg, rgba(var(--accent-rgb), 0.1) 0%, rgba(0,0,0,0.5) 100%)',
          border: isPro ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
          boxShadow: isPro ? '0 0 20px var(--accent-glow)' : 'none',
          position: 'relative', overflow: 'hidden'
        }}>
          {isPro && (
            <div style={{ position: 'absolute', top: 16, right: -30, background: 'var(--accent)', color: 'var(--bg-base)', padding: '4px 40px', transform: 'rotate(45deg)', fontSize: '0.75rem', fontWeight: 800 }}>
              ACTIVE
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
            <Star color="var(--accent)" fill="var(--accent)" size={24} />
            <h3 className="text-display" style={{ fontSize: '1.5rem', margin: 0 }}>Pro</h3>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem' }}>$9.99<span style={{ fontSize: '1rem', color: 'var(--text-3)' }}>/mo</span></div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-1)', fontWeight: 600 }}><Check size={18} color="var(--accent)" /> Everything in Free</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-1)', fontWeight: 600 }}><Zap size={18} color="var(--accent)" /> Unlimited Device Syncs</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-1)', fontWeight: 600 }}><Zap size={18} color="var(--accent)" /> Advanced AI Chat Coach</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-1)', fontWeight: 600 }}><Zap size={18} color="var(--accent)" /> Transformation Predictions</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-1)', fontWeight: 600 }}><AlertCircle size={18} color="var(--accent)" /> Priority Support</li>
          </ul>

          {!isPro ? (
            <button className="btn-primary" onClick={handleUpgrade} disabled={loading} style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {loading ? (
                <><span className="spin" style={{ display: 'inline-block' }}>&#8635;</span> Redirecting...</>
              ) : (
                <>Start 14-Day Free Trial <ArrowRight size={18} /></>
              )}
            </button>
          ) : (
            <button className="btn-ghost" disabled style={{ width: '100%', padding: '14px', color: 'var(--accent)' }}>
              You are on Pro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
