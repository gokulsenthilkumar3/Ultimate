import { Component } from 'react';
import './TabErrorBoundary.css';

/**
 * TabErrorBoundary — wraps individual dashboard tabs to catch render errors
 * without crashing the entire app.
 *
 * Usage:
 *   <TabErrorBoundary tabName="Finance">
 *     <FinanceTab />
 *   </TabErrorBoundary>
 */
export class TabErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[TabErrorBoundary] Tab "${this.props.tabName}" crashed:`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="tab-error-boundary">
          <div className="tab-error-icon">⚠️</div>
          <h3 className="tab-error-title">
            {this.props.tabName ? `"${this.props.tabName}" tab` : 'This tab'} encountered an error
          </h3>
          <pre className="tab-error-message">
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button className="tab-error-retry" onClick={this.handleRetry}>
            ↺ Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default TabErrorBoundary;
