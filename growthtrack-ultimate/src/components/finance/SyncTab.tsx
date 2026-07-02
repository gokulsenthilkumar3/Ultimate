import React, { useState } from 'react';
import { IndianRupee, PieChart, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Trash2, Calendar, CreditCard, Activity, BarChart2, Upload, LineChart as LineIcon, ListTodo, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import useStore from '../../store/useStore';

export default function SyncTab({ axioLastSync, axioSyncing, handleAxioSync, csvUploading, handleCsvImport }) {
  const toast = useToast();
  const syncBankData = useStore((state: any) => state.syncBankData);
  const [syncingProvider, setSyncingProvider] = useState(null);

  const handleProviderSync = async (providerName) => {
    setSyncingProvider(providerName);
    toast.info(`Connecting to ${providerName}...`);
    try {
      // Simulate OAuth network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.info(`Authenticating and fetching secure ledger...`);
      
      const count = await syncBankData(providerName);
      
      toast.success(`Successfully synced ${count} new transactions from ${providerName}!`);
    } catch (e) {
      toast.error(`Failed to sync from ${providerName}. Please try again.`);
    } finally {
      setSyncingProvider(null);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '2.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h3 className="text-display" style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>Open Banking & App Sync</h3>
        <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto' }}>GrowthTrack uses secure read-only access to aggregate your financial telemetry from Indian FinTech apps.</p>
      </div>
      <div style={{ padding: '2rem', marginBottom: '2.5rem', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(255,92,53,0.12), transparent)', border: '1px solid rgba(255,92,53,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#ff5c35', marginBottom: '6px' }}>Axio (Expense Manager)</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', maxWidth: '420px' }}>Auto-scrapes SMS and bank notifications to pull Axio-tracked spends directly into your ledger.<br/><span style={{ color: 'rgba(255,92,53,0.7)', fontSize: '0.75rem' }}>⚡ SMS parsing is in beta — CSV import is the primary path for now.</span></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {axioLastSync && <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '8px' }}>Last sync: {axioLastSync}</p>}
            <button className="btn-primary" style={{ background: '#ff5c35', border: 'none', color: '#fff', opacity: axioSyncing ? 0.7 : 1 }} onClick={handleAxioSync} disabled={axioSyncing}>
              {axioSyncing ? '🔄 SYNCING...' : '⚡ SYNC AXIO NOW'}
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[{ name: 'BHIM / UPI Apps', color: '#0ea5e9', desc: 'Sync GPay, PhonePe, and PayTM flow.' }, { name: 'Slice / Uni Card', color: '#8b5cf6', desc: 'Direct API sync for credit lines.' }, { name: 'Roarbank (Neobank)', color: '#f59e0b', desc: 'Real-time settlement data.' }, { name: 'HDFC / SBI NetBanking', color: '#10b981', desc: 'Secure bank statement parsing.' }].map(p => {
          const isSyncing = syncingProvider === p.name;
          return (
            <div key={p.name} className="hover-lift-dynamic" style={{ '--hover-color': p.color, border: `1px solid ${p.color}33`, padding: '1.5rem', borderRadius: '20px', background: `linear-gradient(135deg, ${p.color}08, transparent)`, display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.3s' }}>
              <h4 style={{ fontWeight: 800, fontSize: '1rem', color: p.color }}>{p.name}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.4 }}>{p.desc}</p>
              <button 
                className="btn-ghost" 
                style={{ width: '100%', borderColor: p.color, color: p.color, fontSize: '0.7rem', opacity: isSyncing || syncingProvider ? 0.5 : 1 }} 
                onClick={() => handleProviderSync(p.name)}
                disabled={!!syncingProvider}
              >
                {isSyncing ? <Activity className="spin" size={14} style={{ display: 'inline', marginRight: 4 }} /> : null}
                {isSyncing ? 'AUTHORIZING...' : 'AUTHORIZE CONNECTION'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--border-strong)', textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: '1rem' }}>Missing an app? Import via CSV — supports 200+ Indian financial institutions.</p>
        <div style={{ display: 'inline-block', position: 'relative' }}>
          <input type="file" accept=".csv" onChange={handleCsvImport} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          <button className="btn-secondary" style={{ pointerEvents: 'none' }}>
            {csvUploading ? <Activity className="spin" size={16} style={{ marginRight: '8px' }} /> : <Upload size={16} style={{ marginRight: '8px' }} />}
            {csvUploading ? 'PROCESSING CSV...' : 'UPLOAD CSV STATEMENT'}
          </button>
        </div>
      </div>
    </div>
  );
}
