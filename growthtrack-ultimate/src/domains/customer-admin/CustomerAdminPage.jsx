import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, X } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import ScopeBadge from '../../components/ui/ScopeBadge';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import { featurePath } from '../../config/featureRegistry';
import { CUSTOMER_PRODUCTS, customerErrorState, listCustomers } from './customerAdminClient';
import './customer-admin.css';

export default function CustomerAdminPage({ product: fixedProduct }) {
  const location = useLocation(), navigate = useNavigate();
  const [chosenProduct, setChosenProduct] = useState('finsync');
  const product = fixedProduct || chosenProduct;
  const [filters, setFilters] = useState({ query: '', status: '', plan: '' });
  const [offset, setOffset] = useState(0), [limit, setLimit] = useState(25);
  const [selected, setSelected] = useState(null);
  const opener = useRef(null);
  const detailHeading = useRef(null);
  const requestedView = new URLSearchParams(location.search).get('view');
  const view = ['customers', 'activity', 'support'].includes(requestedView) ? requestedView : 'customers';
  const directory = useQuery({ queryKey: ['customer-admin', product, filters, offset, limit], queryFn: ({ signal }) => listCustomers(product, { ...filters, offset, limit, signal }), retry: false, staleTime: 0 });
  const page = directory.data;
  const errorState = directory.isError ? customerErrorState(directory.error) : null;
  const scope = errorState === 'setup' ? 'setup' : errorState === 'unavailable' ? 'unavailable' : page ? 'readonly' : null;
  const setFilter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value })); setOffset(0); setSelected(null); };
  const changeView = next => navigate(featurePath(fixedProduct || 'customers', next));
  const clearFilters = () => { setFilters({ query: '', status: '', plan: '' }); setOffset(0); setSelected(null); };
  // Clamp a completed response before paint; new filters/products reset in their event handler.
  if (page && offset && !page.rows.length) {
    const lastOffset = Math.max(0, (Math.ceil(page.total / limit) - 1) * limit);
    if (offset !== lastOffset) setOffset(lastOffset);
  }
  const row = !directory.isFetching && !directory.isError ? page?.rows.find(record => record.id === selected) : null;
  const visibleCustomerId = row?.id;
  useEffect(() => { if (visibleCustomerId) detailHeading.current?.focus({ preventScroll: true }); }, [visibleCustomerId]);
  const columns = [
    { id: 'name', header: 'Customer', accessor: record => record.name, render: record => <button type="button" className="customer-admin-name" onClick={event => { opener.current = event.currentTarget; setSelected(record.id); }} aria-label={`Preview ${record.name}`}><strong>{record.name || 'Unnamed customer'}</strong><small>{record.email}</small></button> },
    { id: 'status', header: 'Status', accessor: record => record.status, render: record => <span className="customer-admin-status">{record.status}</span> },
    { id: 'plan', header: 'Plan', accessor: record => record.plan },
    { id: 'lastActiveAt', header: 'Last active', accessor: record => record.lastActiveAt ? new Date(record.lastActiveAt).toLocaleDateString() : 'Unavailable' },
  ];
  return <section className="customer-admin module-page" aria-label="Customer administration">
    <PageHeader title={fixedProduct ? `${CUSTOMER_PRODUCTS[product]} customers` : 'All customers'} accent="Customers" subtitle={`Manage ${CUSTOMER_PRODUCTS[product]} customer records within their product scope.`} status={scope && <ScopeBadge scope={scope}>{page ? CUSTOMER_PRODUCTS[product] : scope === 'setup' ? 'Not connected' : 'Service unavailable'}</ScopeBadge>} actions={<Button variant="secondary" onClick={() => { setSelected(null); void directory.refetch(); }} disabled={directory.isFetching} icon={<RefreshCw size={16} />}>{directory.isFetching ? 'Checking…' : 'Check connection'}</Button>} />
    <nav className="customer-admin-views" aria-label="Customer administration views">{[['customers', 'Directory'], ['activity', 'Activity'], ['support', 'Support']].map(([key, label]) => <Link key={key} to={featurePath(fixedProduct || 'customers', key)} aria-current={view === key ? 'page' : undefined}>{label}</Link>)}</nav>
    <form className="customer-admin-filters" aria-label="Customer filters" onSubmit={event => event.preventDefault()}>
      {!fixedProduct && <label>Product<select value={product} onChange={event => { setChosenProduct(event.target.value); clearFilters(); }}>{Object.entries(CUSTOMER_PRODUCTS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>}
      <label className="customer-admin-search">Search customers<input type="search" value={filters.query} onChange={event => setFilter('query', event.target.value)} placeholder="Name or email" maxLength={200} /></label>
      <label>Status<select value={filters.status} onChange={event => setFilter('status', event.target.value)}>{[['', 'All statuses'], ['active', 'Active'], ['inactive', 'Inactive'], ['invited', 'Invited']].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Plan<input value={filters.plan} onChange={event => setFilter('plan', event.target.value)} placeholder="Any plan" maxLength={100} /></label>
      <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
    </form>
    <p className="customer-admin-provenance">Product: <strong>{CUSTOMER_PRODUCTS[product]}</strong> · {page && !directory.isError ? 'Read-only customer records' : 'No customer records loaded'}</p>
    {directory.isPending || directory.isFetching ? <PageState state="loading" title={`Loading ${CUSTOMER_PRODUCTS[product]} customers`} /> : errorState ? <PageState state={errorState} title={errorState === 'setup' ? `${CUSTOMER_PRODUCTS[product]} administration is not connected` : errorState === 'denied' ? 'Customer access is restricted' : undefined} description={errorState === 'setup' ? 'A workspace administrator must connect an authorised customer service before records can be shown. No customer data is loaded.' : undefined} onRetry={errorState === 'setup' || errorState === 'denied' || errorState === 'unauthorized' ? undefined : () => void directory.refetch()} /> : view === 'customers' ? <div className="customer-admin-layout" data-has-detail={Boolean(row)}>
      <div className="customer-admin-directory"><DataTable caption={`${CUSTOMER_PRODUCTS[product]} customer directory`} rows={page?.rows || []} columns={columns} rowKey={record => record.id} emptyMessage="No customers match these filters. Clear the filters to review the directory." />
        <div className="customer-admin-pagination"><span>{page?.total || 0} matching records · {page?.total ? `${offset + 1}–${Math.min(offset + limit, page.total)}` : '0'} shown</span><label>Rows<select value={limit} onChange={event => { setLimit(Number(event.target.value)); setOffset(0); setSelected(null); }}>{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label><Button variant="secondary" disabled={!offset} onClick={() => { setOffset(Math.max(0, offset - limit)); setSelected(null); }}>Previous</Button><Button variant="secondary" disabled={!page || offset + limit >= page.total} onClick={() => { setOffset(offset + limit); setSelected(null); }}>Next</Button></div>
      </div>
      {row && <aside className="customer-admin-detail" aria-label={`${CUSTOMER_PRODUCTS[product]} customer preview`}><header><h2 ref={detailHeading} tabIndex={-1}>Customer preview</h2><button type="button" aria-label="Close customer preview" onClick={() => { setSelected(null); opener.current?.focus(); }}><X size={18} /></button></header><ScopeBadge scope="readonly">{CUSTOMER_PRODUCTS[product]}</ScopeBadge><h3>{row.name}</h3><dl>{[['Email', row.email], ['Status', row.status], ['Plan', row.plan], ['Customer ID', row.id]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Unavailable'}</dd></div>)}</dl><p>Plan changes and support-note editing are unavailable until their permissions and service connections are configured.</p></aside>}
    </div> : <PageState state="setup" title={view === 'activity' ? 'Customer activity is not connected' : 'Customer support history is not connected'} description={view === 'activity' ? 'A redacted, product-scoped activity service is required. No audit events are simulated.' : 'An authorised support service is required before notes can be read or written.'} />}
    {view !== 'customers' && <Button variant="secondary" onClick={() => changeView('customers')}>Return to directory</Button>}
  </section>;
}
