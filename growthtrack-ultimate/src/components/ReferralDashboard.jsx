import React, { useState, useEffect } from 'react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { Link, Copy, CheckCircle, Clock, Users, Gift } from 'lucide-react';

export default function ReferralDashboard() {
  const user = useStore(state => state.user);
  const toast = useToast();
  const [data, setData] = useState({ creditBalance: 0, history: [], referralCode: user?.referralCode || '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await apiSync('/referrals', 'GET');
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  const referralLink = `${window.location.origin}/login?ref=${data.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

  return (
    <div className="stagger-container" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--accent)', padding: '12px', borderRadius: '16px' }}>
          <Gift size={24} color="var(--bg-base)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Refer a Friend</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Get $10 when they sync their first device.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-card fade-in" style={{ padding: '1.5rem' }}>
          <p className="label-caps" style={{ color: 'var(--text-3)', marginBottom: '8px' }}>Your Credit Balance</p>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981' }}>
            ${data.creditBalance}
          </div>
        </div>
        <div className="glass-card fade-in" style={{ padding: '1.5rem' }}>
          <p className="label-caps" style={{ color: 'var(--text-3)', marginBottom: '8px' }}>Total Invites</p>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent)' }}>
            {data.history.length}
          </div>
        </div>
      </div>

      <div className="glass-card fade-in" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <p className="label-caps" style={{ color: 'var(--text-3)', marginBottom: '12px' }}>Your Unique Link</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{
            flex: 1, padding: '12px 16px', background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', borderRadius: '12px',
            color: 'var(--text-1)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {referralLink}
          </div>
          <button className="btn-primary" onClick={handleCopy} style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={16} /> Copy
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Invite History</h3>
      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Loading history...</p>
      ) : data.history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
          <Users size={32} color="var(--text-3)" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>No invites yet. Share your link to get started!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.history.map((ref) => (
            <div key={ref.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)'
            }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>Invited User</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{new Date(ref.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                {ref.status === 'completed' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '6px 12px', borderRadius: '20px' }}>
                    <CheckCircle size={14} /> +$10 Earned
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'orange', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(255,165,0,0.1)', padding: '6px 12px', borderRadius: '20px' }}>
                    <Clock size={14} /> Pending Sync
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
