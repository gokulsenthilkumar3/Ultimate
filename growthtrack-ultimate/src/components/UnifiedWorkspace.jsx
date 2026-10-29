import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { PRODUCTS, productById } from '../config/products';
import '../styles/unified-workspace.css';
import PageHeader from './ui/PageHeader';
import { featurePath } from '../config/featureRegistry';

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

export default function UnifiedWorkspace({ defaultApp = 'matrix', onNavigate }) {
  const [activeTab, setActiveTab] = useState(defaultApp);
  const [services, setServices] = useState({});
  const [healthError, setHealthError] = useState(false);
  const [healthChecked, setHealthChecked] = useState(false);
  const [frameVersion, setFrameVersion] = useState(0);

  useEffect(() => setActiveTab(defaultApp), [defaultApp]);

  const refreshHealth = async () => {
    try {
      const response = await fetch('/api/gateway/health', { credentials: 'include' });
      if (!response.ok) throw new Error('Gateway unavailable');
      const data = await response.json();
      if (!Array.isArray(data.services)) throw new Error('Service status is invalid');
      setServices(previous => ({ ...previous, ...Object.fromEntries(data.services.map(service => [service.id, service])) }));
      setHealthError(false);
    } catch {
      setHealthError(true);
    } finally {
      setHealthChecked(true);
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
  const selectedService = selected && services[selected.id];
  const customerAdmin = selected && ['finsync', 'oxfin'].includes(selected.id);
  const visible = selected ? [selected] : PRODUCTS;

  return <section className="unified-workspace" aria-label="Ultimate companion integration">
    <PageHeader accent="Apps Suite" title={selected ? selected.name : 'Apps Suite'} subtitle={selected ? selected.description : 'Choose a connected product. Each keeps its existing records and sign-in.'} actions={<button type="button" className="unified-action-btn" onClick={() => { refreshHealth(); setFrameVersion(value => value + 1); }}><RefreshCw size={14} /> Refresh{selected ? ' app' : ' status'}</button>} />

    <nav className="unified-tabs" aria-label="Companion products">
      <button type="button" className={`unified-tab-btn ${!selected ? 'is-active' : ''}`} aria-current={!selected ? 'page' : undefined} onClick={() => select('matrix')}>All products</button>
      {PRODUCTS.map(product => <button type="button" key={product.id}
        className={`unified-tab-btn ${activeTab === product.id ? 'is-active' : ''}`}
        aria-current={activeTab === product.id ? 'page' : undefined}
        onClick={() => select(product.id)}>{product.icon} {product.name}</button>)}
    </nav>

    {healthError && <p className="unified-health-error" role="status">Service status is unavailable. Ultimate routes remain usable.</p>}
    {customerAdmin ? <section className="unified-product-view" aria-label={`${selected.name} administration`}>
      <h2>{selected.name} customer administration</h2>
      <p>Manage customers in Ultimate. The customer-facing product keeps its own sign-in and records.</p>
      <div className="unified-native-links"><Link to={featurePath(selected.id)}>Manage {selected.name} customers</Link><a href={selected.uiUrl} target="_blank" rel="noopener noreferrer">Open separate {selected.name} product <ArrowUpRight size={14} aria-hidden="true" /></a></div>
    </section> : selected ? <section className="unified-product-view" aria-label={`${selected.name} workspace`}>
      <div className="unified-product-toolbar">
        <span className="unified-product-context">Related Ultimate records</span>
        <div className="unified-native-links">{ULTIMATE_DESTINATIONS[selected.id].map(([label, href]) => <Link key={href} to={href}>{label}</Link>)}</div>
      </div>
      {selectedService?.online === true ? <iframe key={`${selected.id}-${frameVersion}`} className="unified-product-frame" src={selected.uiUrl} title={`${selected.name} app`} allow="clipboard-read; clipboard-write" />
        : selectedService ? <div className="unified-app-offline" role="status"><h2>{selected.name} is starting or unavailable</h2><p>Refresh after the product is available. Your existing records remain in {selected.name}.</p><details><summary>Local service details</summary><p>Start the workspace with <code>npm run dev:all</code>, then refresh this app.</p></details></div>
        : <div className="unified-app-offline" role="status"><h2>{healthChecked ? `${selected.name} status is unavailable` : `Checking ${selected.name}`}</h2><p>{healthChecked ? 'Refresh to check again, or open the separate product.' : 'Checking availability before opening the app.'}</p>{healthChecked && <a href={selected.uiUrl} target="_blank" rel="noopener noreferrer">Open separate {selected.name} <ArrowUpRight size={13} aria-hidden="true" /></a>}</div>}
    </section> : <div className="unified-matrix-grid">
      {visible.map(product => {
        const service = services[product.id];
        return <article key={product.id} className="unified-matrix-card" style={{ '--card-color': product.color }}>
          <div className="unified-matrix-card-top">
            <span className="unified-matrix-card-icon" aria-hidden="true">{product.icon}</span>
            <span className={`unified-source-status ${service?.online ? 'is-online' : ''}`}>{['finsync', 'oxfin'].includes(product.id) ? 'Admin setup' : service ? service.online ? 'Online' : 'Offline' : healthChecked ? 'Unknown' : 'Checking'}</span>
          </div>
          <h2>{product.name}</h2>
          <p>{['finsync', 'oxfin'].includes(product.id) ? 'Product-scoped customer administration in Ultimate; the customer product stays separate.' : product.description}</p>
          <button type="button" className="unified-action-btn unified-open-product" onClick={() => select(product.id)}>{['finsync', 'oxfin'].includes(product.id) ? `Manage ${product.name} customers` : `Open ${product.name}`} <ArrowUpRight size={13} /></button>
        </article>;
      })}
    </div>}
  </section>;
}
