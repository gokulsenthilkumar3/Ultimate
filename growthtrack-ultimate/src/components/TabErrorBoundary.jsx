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
        <div className="tab-error-boundary" role="alert">
          <div className="tab-error-icon">⚠️</div>
          <h3 className="tab-error-title">
            {this.props.tabName || 'This page'} could not load
          </h3>
          <p className="tab-error-message">
            Try loading this page again. If it still does not open, choose another page from the navigation.
          </p>
          <button type="button" className="tab-error-retry gt-button gt-button--secondary" onClick={this.handleRetry}>
            Retry page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default TabErrorBoundary;
