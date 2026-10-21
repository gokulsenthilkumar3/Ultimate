import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[GrowthTrack] Component Error:', error, info); }
  componentDidUpdate(previous) {
    if (this.state.hasError && this.props.resetKey !== previous.resetKey) this.handleRetry();
  }
  handleRetry = () => this.setState({ hasError: false, error: null });
  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return <section className="glass-card" role="alert" style={{padding:'2rem',margin:'1rem 0',maxWidth:'100%'}}>
      <AlertTriangle size={28} aria-hidden="true" />
      <h2 style={{margin:'1rem 0 .5rem'}}>This page could not load</h2>
      <p className="text-secondary">Try again, or open another page from the navigation. Your saved data has not been changed.</p>
      <button className="btn-primary" onClick={this.handleRetry} style={{marginTop:'1rem'}}><RefreshCw size={16} /> Retry page</button>
      {import.meta.env.DEV && <details style={{marginTop:'1rem'}}><summary>Technical details</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{this.state.error?.message}</pre></details>}
    </section>;
  }
}
