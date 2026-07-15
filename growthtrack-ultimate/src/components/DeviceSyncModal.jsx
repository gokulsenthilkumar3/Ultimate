import React, { useState } from 'react';
import { COLORS } from '../constants';
import { useToast } from '../hooks/useToast';
import useStore from '../store/useStore';

export default function DeviceSyncModal({ onClose }) {
  const [syncing, setSyncing] = useState(false);
  const { addToast } = useToast();
  const fetchInitialData = useStore(state => state.fetchInitialData);

  const handleAppleHealthSync = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/health/sync/apple', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync');

      addToast({ title: 'Sync Complete', message: 'Apple Health data imported successfully', type: 'success' });
      await fetchInitialData(); // Refresh logs to trigger avatar morph
      onClose();
    } catch (err) {
      addToast({ title: 'Sync Failed', message: err.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-2)', width: '90%', maxWidth: '400px',
        borderRadius: '24px', padding: '32px', position: 'relative',
        border: '1px solid var(--border-subtle)', color: 'var(--text-1)'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '24px', right: '24px',
          background: 'none', border: 'none', color: 'var(--text-2)',
          fontSize: '1.2rem', cursor: 'pointer'
        }}>✕</button>
        
        <h2 style={{ margin: '0 0 8px 0', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Integrations</h2>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Connect your devices to automatically sync health and fitness data.
        </p>

        <div style={{
          border: '1px solid var(--border-strong)', borderRadius: '16px',
          padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#ff2d55', fontWeight: 800, fontSize: '1.2rem' }}>♥</span>
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>Apple Health</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Weight, Steps, Sleep</div>
            </div>
          </div>
          
          <button 
            onClick={handleAppleHealthSync} 
            disabled={syncing}
            style={{
              background: syncing ? 'var(--bg-3)' : COLORS.ACCENT_PRIMARY,
              color: '#fff', border: 'none', padding: '8px 16px',
              borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700,
              cursor: syncing ? 'not-allowed' : 'pointer'
            }}
          >
            {syncing ? 'Syncing...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
