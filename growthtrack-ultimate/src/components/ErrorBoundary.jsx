import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

/**
 * ErrorBoundary — catches runtime errors in any child component.
 * Shows a friendly fallback UI with options to retry or reset all data.
 * Must be a class component (React requirement for error boundaries).
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[GrowthTrack] Component Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleResetData = () => {
    if (window.confirm('⚠️ This will clear ALL your GrowthTrack data and reset to defaults. Continue?')) {
      try {
        // Clear both old and new storage keys
        localStorage.removeItem('growthtrack-ultimate-v3');
        localStorage.removeItem('ultimate_user');
        localStorage.removeItem('ultimate_theme');
        localStorage.removeItem('ultimate_palette');
        localStorage.removeItem('ultimate_tab');
      } catch {
        // ignore
      }
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
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
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(248,113,113,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(248,113,113,0.25)',
        }}>
          <AlertTriangle size={32} color="#f87171" />
        </div>

        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text-1)',
            letterSpacing: '-0.02em',
            marginBottom: '0.35rem',
          }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', maxWidth: '400px' }}>
            A module crashed unexpectedly. Your other data is safe.
          </p>
          {this.state.error && (
            <p style={{
              marginTop: '0.5rem',
              fontSize: '0.72rem',
              color: '#f87171',
              background: 'rgba(248,113,113,0.08)',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontFamily: 'monospace',
              maxWidth: '500px',
              wordBreak: 'break-word',
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
              padding: '0.65rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} /> Retry Module
          </button>
          <button
            onClick={this.handleResetData}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.4rem',
              borderRadius: '8px',
              border: '1px solid rgba(248,113,113,0.3)',
              background: 'rgba(248,113,113,0.08)',
              color: '#f87171',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={15} /> Reset All Data
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
