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
    <div className="glass-card finance-sync-container">
      <div className="finance-sync-header">
        <h3 className="text-display finance-sync-title">Open Banking & App Sync</h3>
        <p className="text-secondary finance-sync-subtitle">GrowthTrack uses secure read-only access to aggregate your financial telemetry from Indian FinTech apps.</p>
      </div>
      <div className="finance-sync-axio-card">
        <div className="finance-sync-axio-flex">
          <div>
            <h4 className="finance-sync-axio-title">Axio (Expense Manager)</h4>
            <p className="finance-sync-axio-desc">Auto-scrapes SMS and bank notifications to pull Axio-tracked spends directly into your ledger.<br/><span className="finance-sync-axio-beta">⚡ SMS parsing is in beta — CSV import is the primary path for now.</span></p>
          </div>
          <div className="finance-sync-axio-right">
            {axioLastSync && <p className="finance-sync-axio-lastsync">Last sync: {axioLastSync}</p>}
            <button className={`finance-sync-axio-btn btn-primary ${axioSyncing ? 'finance-syncing-opacity' : ''}`} onClick={handleAxioSync} disabled={axioSyncing}>
              {axioSyncing ? '🔄 SYNCING...' : '⚡ SYNC AXIO NOW'}
            </button>
          </div>
        </div>
      </div>
      <div className="finance-sync-grid">
        {[{ name: 'BHIM / UPI Apps', color: '#0ea5e9', desc: 'Sync GPay, PhonePe, and PayTM flow.' }, { name: 'Slice / Uni Card', color: '#8b5cf6', desc: 'Direct API sync for credit lines.' }, { name: 'Roarbank (Neobank)', color: '#f59e0b', desc: 'Real-time settlement data.' }, { name: 'HDFC / SBI NetBanking', color: '#10b981', desc: 'Secure bank statement parsing.' }].map((p, index) => {
          const isSyncing = syncingProvider === p.name;
          return (
            <div key={p.name} className={`hover-lift-dynamic finance-sync-provider-card finance-provider-${index}`}>
              <h4 className={`finance-sync-provider-title finance-provider-${index}-text`}>{p.name}</h4>
              <p className="finance-sync-provider-desc">{p.desc}</p>
              <button 
                className={`btn-ghost finance-sync-provider-btn finance-provider-${index}-btn ${isSyncing || syncingProvider ? 'finance-syncing-opacity' : ''}`} 
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
      <div className="glass-card finance-sync-csv-card">
        <p className="finance-sync-csv-desc">Missing an app? Import via CSV — supports 200+ Indian financial institutions.</p>
        <div className="finance-sync-csv-wrapper">
          <input type="file" title="Upload CSV" aria-label="Upload CSV statement" accept=".csv" onChange={handleCsvImport} className="finance-sync-csv-input" />
          <button className="btn-secondary finance-sync-csv-btn">
            {csvUploading ? <Activity className="spin" size={16} style={{ marginRight: '8px' }} /> : <Upload size={16} style={{ marginRight: '8px' }} />}
            {csvUploading ? 'PROCESSING CSV...' : 'UPLOAD CSV STATEMENT'}
          </button>
        </div>
      </div>
    </div>
  );
}
