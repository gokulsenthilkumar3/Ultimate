import React from 'react';
import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react';

/**
 * ErrorBoundary — catches runtime errors in any child component.
 * Shows a friendly fallback UI with options to retry or reset all data.
 * Uses a custom in-app confirmation modal instead of window.confirm().
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showConfirm: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[GrowthTrack] Component Error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.handleRetry();
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showConfirm: false });
  };

  handleResetData = () => {
    try {
      localStorage.removeItem('growthtrack-ultimate-v4');
      localStorage.removeItem('growthtrack-ultimate-v3');
      localStorage.removeItem('ultimate_user');
      localStorage.removeItem('ultimate_theme');
      localStorage.removeItem('ultimate_palette');
      localStorage.removeItem('ultimate_tab');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Compact inline fallback — used inside Canvas / embedded contexts
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const confirmModal = this.state.showConfirm && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div style={{
          background: 'var(--bg-elevated, #1a1c2e)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trash2 size={20} color="#f87171" />
              <h3 id="confirm-title" style={{ margin: 0, color: '#f87171', fontWeight: 800, fontSize: '1rem' }}>
                Reset All Data?
              </h3>
            </div>
            <button
              onClick={() => this.setState({ showConfirm: false })}
              aria-label="Cancel reset"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3, #666)', padding: '4px', borderRadius: '6px' }}
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-2, #aaa)', lineHeight: 1.6 }}>
            ⚠️ This will permanently clear <strong>ALL your GrowthTrack data</strong> and reset the app to defaults. This action cannot be undone.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => this.setState({ showConfirm: false })}
              autoFocus
              style={{
                flex: 1, padding: '0.65rem 1rem', borderRadius: '8px',
                border: '1px solid var(--border, #333)',
                background: 'transparent', color: 'var(--text-1, #eee)',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
              }}
            >
              Cancel
            </button>
            <button
              onClick={this.handleResetData}
              style={{
                flex: 1, padding: '0.65rem 1rem', borderRadius: '8px',
                border: 'none', background: '#ef4444',
                color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
              }}
            >
              Yes, Reset Everything
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <>
        {confirmModal}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          gap: '1.25rem',
        }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(248,113,113,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(248,113,113,0.25)',
          }}>
            <AlertTriangle size={32} color="#f87171" />
          </div>

          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800,
              color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: '0.35rem',
            }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', maxWidth: '400px' }}>
              A module crashed unexpectedly. Your other data is safe.
            </p>
            {this.state.error && (
              <p style={{
                marginTop: '0.5rem', fontSize: '0.72rem', color: '#f87171',
                background: 'rgba(248,113,113,0.08)', padding: '0.4rem 0.75rem',
                borderRadius: '6px', fontFamily: 'monospace',
                maxWidth: '500px', wordBreak: 'break-word',
              }}>
                {this.state.error.message}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.4rem', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} /> Retry Module
            </button>
            <button
              onClick={() => this.setState({ showConfirm: true })}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.4rem', borderRadius: '8px',
                border: '1px solid rgba(248,113,113,0.3)',
                background: 'rgba(248,113,113,0.08)', color: '#f87171',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
              }}
            >
              <Trash2 size={15} /> Reset All Data
            </button>
          </div>
        </div>
      </>
    );
  }
}

export default ErrorBoundary;
