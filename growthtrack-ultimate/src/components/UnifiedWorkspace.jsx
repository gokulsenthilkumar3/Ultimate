import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Database, RefreshCw, ShieldCheck } from 'lucide-react';
import { PRODUCTS, productById } from '../config/products';
import '../styles/unified-workspace.css';

// These destinations use Ultimate-owned records. They are related workflows,
// not a claim that companion features or data have already been migrated.
const ULTIMATE_DESTINATIONS = {
  finsync: [
    ['Transactions', '/finance/transactions'], ['Budgeting', '/finance/budgeting'],
    ['Finance imports', '/finance/sync'], ['Portfolio', '/finance/portfolio'],
  ],
  oxfin: [
    ['Transactions', '/finance/transactions'], ['Subscriptions', '/finance/subscriptions'],
    ['Portfolio', '/finance/portfolio'], ['Shopping', '/finance/shopping'],
  ],
  forex: [['Forecast', '/insights/forecast'], ['Portfolio', '/finance/portfolio']],
  equity: [['Portfolio', '/finance/portfolio'], ['Finance analytics', '/finance/analytics']],
  family: [['Calendar', '/workspace/calendar'], ['My Files', '/workspace/files'], ['Places', '/life/places']],
};

const REMAINING = {
  finsync: 'Bank consent and planning data still need previewable import and ledger reconciliation.',
  oxfin: 'Wallets, cards, bills and investments still need native records and workflows.',
  forex: 'Currency watchlists and model results still need a sourced Ultimate contract and worker.',
  equity: 'Market charts, indicators, options and alerts still need native routes and data provenance.',
  family: 'Family spaces, invitations and record-level sharing still need a permissioned data model.',
};

export default function UnifiedWorkspace({ defaultApp = 'matrix', onNavigate }) {
  const [activeTab, setActiveTab] = useState(defaultApp);
  const [services, setServices] = useState({});
  const [healthError, setHealthError] = useState(false);

  useEffect(() => setActiveTab(defaultApp), [defaultApp]);

  const refreshHealth = async () => {
    try {
      const response = await fetch('/api/gateway/health', { credentials: 'include' });
      if (!response.ok) throw new Error('Gateway unavailable');
      const data = await response.json();
      setServices(Object.fromEntries((data.services || []).map(service => [service.id, service])));
      setHealthError(false);
    } catch {
      setHealthError(true);
    }
  };

  useEffect(() => {
    refreshHealth();
    const timer = setInterval(refreshHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  const select = id => {
    setActiveTab(id);
    onNavigate?.(id);
  };
  const selected = productById(activeTab);
  const visible = selected ? [selected] : PRODUCTS;

  return <section className="unified-workspace" aria-label="Ultimate companion integration">
    <header className="unified-header">
      <div>
        <h1 className="unified-title">One Ultimate workspace</h1>
        <p className="unified-intro">Companion workflows are being moved into Ultimate-owned records and routes. Originals remain available while migration is verified.</p>
      </div>
      <button type="button" className="unified-action-btn" onClick={refreshHealth}><RefreshCw size={14} /> Refresh status</button>
    </header>

    <nav className="unified-tabs" aria-label="Companion products">
      <button type="button" className={`unified-tab-btn ${!selected ? 'is-active' : ''}`} aria-current={!selected ? 'page' : undefined} onClick={() => select('matrix')}>All five</button>
      {PRODUCTS.map(product => <button type="button" key={product.id}
        className={`unified-tab-btn ${activeTab === product.id ? 'is-active' : ''}`}
        aria-current={activeTab === product.id ? 'page' : undefined}
        onClick={() => select(product.id)}>{product.icon} {product.name}</button>)}
    </nav>

    {healthError && <p className="unified-health-error" role="status">Service status is unavailable. Ultimate routes remain usable.</p>}
    <div className="unified-matrix-grid">
      {visible.map(product => {
        const service = services[product.id];
        return <article key={product.id} className="unified-matrix-card" style={{ '--card-color': product.color }}>
          <div className="unified-matrix-card-top">
            <span className="unified-matrix-card-icon" aria-hidden="true">{product.icon}</span>
            <span className={`unified-source-status ${service?.online ? 'is-online' : ''}`}>{service ? service.online ? 'Source running' : 'Source offline' : 'Source status unknown'}</span>
          </div>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <div className="unified-integration-state"><ShieldCheck size={15} /> Ultimate integration in progress</div>
          <h3>Use in Ultimate</h3>
          <div className="unified-native-links">
            {ULTIMATE_DESTINATIONS[product.id].map(([label, href]) => <Link key={href} to={href}>{label} <ArrowUpRight size={13} /></Link>)}
          </div>
          <p className="unified-remaining"><Database size={15} aria-hidden="true" /> {REMAINING[product.id]}</p>
          <a className="unified-legacy-link" href={product.uiUrl} target="_blank" rel="noopener noreferrer">Open original app during migration <ArrowUpRight size={13} /></a>
        </article>;
      })}
    </div>
  </section>;
}
