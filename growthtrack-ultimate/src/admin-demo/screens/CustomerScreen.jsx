import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Avatar, Badge, Button, CheckCircle2, Clock3, IconButton, Metrics, Panel, Plus, RecordsTable, ShieldCheck, Users, Wallet, X } from '../components';
import { ACTIVITY } from '../fixtures';
import { filterRecords } from '../models/tableModel';
import CustomerDetail from '../dialogs/CustomerDetail';
import { statusTone } from './screenHelpers';

const activityValue = row => /just now/i.test(row.activity) ? 0 : /yesterday/i.test(row.activity) ? -1440 : -(Number.parseInt(row.activity, 10) || 0) * (/day/i.test(row.activity) ? 1440 : /hour/i.test(row.activity) ? 60 : 1);
export function CustomerScreen({ page, view, customers, openCustomer, addRecord, updateCustomer }) {
  const [status, setStatus] = useState('All'), [plan, setPlan] = useState('All'), [productFilter, setProductFilter] = useState('All'), [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const heading = useRef(null), opener = useRef(null);
  const product = page.id === 'finsync' ? 'FinSync' : page.id === 'oxfin' ? 'OxFin' : null;
  const records = customers.filter(customer => !product || customer.product === product);
  const filtered = records.filter(customer => (status === 'All' || customer.status === status) && (plan === 'All' || customer.plan === plan) && (productFilter === 'All' || customer.product === productFilter));
  const matching = filterRecords(filtered, query);
  const selected = matching.find(customer => customer.id === selectedId);
  useEffect(() => { if (selectedId && !selected) setSelectedId(null); }, [selectedId, selected]);
  useEffect(() => { if (selectedId) heading.current?.focus(); }, [selectedId]);
  const reset = () => { setStatus('All'); setPlan('All'); setProductFilter('All'); setQuery(''); };
  const columns = [
    { key: 'name', label: 'Customer', render: row => <button className="person person-preview" aria-label={`Preview ${row.name}`} aria-pressed={selectedId === row.id} onClick={event => { opener.current = event.currentTarget; setSelectedId(row.id); }}><Avatar {...row} small /><span><strong>{row.name}</strong><small>{row.email}</small></span></button> },
    { key: 'product', label: 'Product', render: row => <span className="product-label"><span className={`product-mark ${row.product.toLowerCase()}`}>{row.product === 'FinSync' ? 'F' : 'O'}</span>{row.product}</span> },
    { key: 'plan', label: 'Plan' },
    { key: 'status', label: 'Status', render: row => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: 'activity', label: 'Last active', sortValue: activityValue },
  ];
  return <>
    <div className="context-banner"><ShieldCheck size={17} /><span>{product ? `${product} customer administration` : 'One customer workspace for FinSync and OxFin'}<small>Product scope: {product || 'FinSync and OxFin'} · Fictional records · Local edits only</small></span><Badge tone="neutral">Sample workspace</Badge></div>
    <Metrics items={[{ label: 'Total customers', value: records.length, detail: 'entire sample directory', icon: Users }, { label: 'Active', value: records.filter(customer => customer.status === 'Active').length, detail: 'entire sample directory', icon: CheckCircle2 }, { label: 'Awaiting review', value: records.filter(customer => customer.status === 'Review').length, detail: 'entire sample directory', icon: Clock3 }, { label: 'Invitations', value: records.filter(customer => customer.status === 'Invited').length, detail: 'sample invitations only', icon: Wallet }]} />
    {view === 'activity' ? <Panel title="Customer activity" subtitle="Read-only sample events; no real audit stream is connected." provenance="Read-only sample"><div className="activity-list spacious">{ACTIVITY.filter(event => !product || event.text.includes(product) || event.title.includes(product)).map((event, index) => <div className="activity-item" key={event.title}><span className={`activity-dot dot-${index}`} /><div><strong>{event.title}</strong><p>{event.text}</p></div><time>{event.time} ago</time></div>)}</div></Panel>
      : view === 'support' ? <div className="two-columns">{records.filter(customer => customer.status === 'Review').map(customer => <Panel key={customer.id} title={customer.issue} subtitle={`${customer.id} · ${customer.product}`} provenance="Local notes only" action={<Badge tone="amber">Open sample request</Badge>}><div className="support-body"><div className="person"><Avatar {...customer} /><span><strong>{customer.name}</strong><small>{customer.email}</small></span></div><p>Review the sample profile and support notes. No customer service is contacted.</p><Button onClick={() => openCustomer(customer)} icon={ArrowUpRight}>Review customer</Button></div></Panel>)}</div>
      : <div className={selected ? 'master-detail-frame' : undefined}>
        <Panel className="customer-master" title={product ? `${product} directory` : 'Customer directory'} subtitle="Select a name for an inline preview, or open its full profile." action={<Button icon={Plus} variant="primary" onClick={() => addRecord('customer', product)}>Add sample customer</Button>}>
          <div className="filter-bar">{['All', 'Active', 'Review', 'Invited', 'Inactive'].map(value => <button key={value} className={value === status ? 'filter-chip selected' : 'filter-chip'} onClick={() => setStatus(value)} aria-pressed={value === status}>{value}{value === 'All' && <span>{records.length}</span>}</button>)}</div>
          <div className="typed-filters">
            <label>Plan<select aria-label="Customer plan filter" value={plan} onChange={event => setPlan(event.target.value)}><option value="All">All plans</option>{['Starter', 'Plus', 'Premium'].map(value => <option key={value}>{value}</option>)}</select></label>
            {!product && <label>Product<select aria-label="Customer product filter" value={productFilter} onChange={event => setProductFilter(event.target.value)}><option value="All">Both products</option><option>FinSync</option><option>OxFin</option></select></label>}
            <Button onClick={reset}>Reset filters</Button>
          </div>
          <RecordsTable rows={filtered} columns={columns} label="Customer directory" onRow={openCustomer} query={query} onQueryChange={setQuery} filterKey={`${status}:${plan}:${productFilter}`} onClearFilters={reset} searchPlaceholder="Search customers by name, email or ID…" />
          <div className="table-footer"><span>Fictional customer data · Session only</span><span>{matching.length} matching {matching.length === 1 ? 'customer' : 'customers'}</span></div>
        </Panel>
        {selected && <section className="panel" role="region" aria-label={`${selected.product} customer preview`}>
          <div className="detail-heading"><h2 ref={heading} tabIndex={-1}>Customer preview</h2><IconButton label="Close customer preview" onClick={() => { setSelectedId(null); opener.current?.focus(); }}><X size={18} /></IconButton></div>
          <CustomerDetail key={selected.id} customer={selected} onUpdate={(updated, message) => updateCustomer?.(updated, message)} />
          <div className="panel-bottom"><Button onClick={() => openCustomer(selected)}>Open full profile</Button></div>
        </section>}
      </div>}
  </>;
}
export default CustomerScreen;
