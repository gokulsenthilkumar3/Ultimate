import React, { useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Avatar, Badge, Clock3, Icon, IconButton, Leaf, LineChart, Metrics, Panel, ShieldCheck, Users } from '../components';
import { ACTIVITY, CUSTOMERS } from '../fixtures';
import { statusTone } from './screenHelpers';

export function OverviewScreen({ nav, openCustomer, customers = CUSTOMERS }) {
  const [range, setRange] = useState('30 days');
  return <>
    <Metrics items={[
      { label: 'Customers', value: customers.length.toLocaleString(), delta: '2 new', detail: 'this week', icon: Users },
      { label: 'Active accounts', value: customers.filter(c => c.status === 'Active').length, delta: '1', detail: 'since last week', icon: ShieldCheck },
      { label: 'Needs attention', value: customers.filter(c => c.status === 'Review').length, detail: 'customer requests to review', icon: Clock3 },
      { label: 'Connected workspaces', value: '4', detail: 'one place to keep moving', icon: LayoutIcon },
    ]} />
    <div className="grid-main">
      <Panel title="Customer activity" subtitle="A closer look at your product community" action={<select aria-label="Activity period" value={range} onChange={e => setRange(e.target.value)}>{['7 days', '30 days', '90 days'].map(r => <option key={r}>{r}</option>)}</select>}>
        <div className="chart-summary"><span className="chart-big">{range === '7 days' ? '218' : range === '30 days' ? '864' : '2,406'}</span><span className="positive change-pill">↗ 12.8%</span><span className="muted small">sample sessions</span></div>
        <LineChart range={range} /><div className="chart-legend"><span><i />FinSync & OxFin sessions</span><span className="muted">Illustrative activity</span></div>
      </Panel>
      <Panel title="Needs your attention" action={<span className="count-tag">2</span>} className="attention-panel">
        <p className="panel-intro">A few things to keep your day moving.</p>
        {customers.filter(c => c.status === 'Review').slice(0, 2).map(c => <button className="attention-item" key={c.id} onClick={() => openCustomer(c)}><span className="attention-icon"><ShieldCheck size={18} /></span><span><strong>{c.issue}</strong><small>{c.name} · {c.product}</small></span><ArrowUpRight size={15} /></button>)}
        <div className="attention-note"><Leaf size={20} /><div><strong>Room for a little progress</strong><p>Your next GrowthTrack review is ready.</p><button className="text-button" onClick={() => nav('wellness')}>Open GrowthTrack <ArrowRight size={13} /></button></div></div>
      </Panel>
    </div>
    <div className="section-heading"><h2>Your workspaces</h2><button className="text-button" onClick={() => nav('apps')}>View all modules <ArrowRight size={14} /></button></div>
    <div className="workspace-grid">{[
      ['wellness', 'GrowthTrack', 'A little better, every day.', 'sage', 'Personal growth'],
      ['equity', 'Equity', 'Your markets, in focus.', 'blue', 'Market workspace'],
      ['forex', 'Forex', 'See the bigger picture.', 'lilac', 'Currency research'],
      ['family', 'Family Connect', 'Keep your people close.', 'peach', 'Family workspace'],
    ].map(([id, name, text, color, tag]) => <button key={id} className="workspace-card" onClick={() => nav(id)}><span className={`module-icon ${color}`}><Icon name={id} /></span><ArrowUpRight size={16} className="workspace-arrow" /><h3>{name}</h3><p>{text}</p><span className="module-tag">{tag}</span></button>)}</div>
    <div className="grid-main bottom-grid"><Panel title="Recent customers" subtitle="People joining your products" action={<button className="text-button" onClick={() => nav('customers')}>All customers <ArrowRight size={14} /></button>}><div className="table-scroll"><table aria-label="Recent customers"><thead><tr><th scope="col">Customer</th><th scope="col">Product</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Open customer</span></th></tr></thead><tbody>{customers.slice(0, 3).map(c => <tr key={c.id}><td><div className="person"><Avatar {...c} small /><span><strong>{c.name}</strong><small>{c.id}</small></span></div></td><td>{c.product}</td><td><Badge tone={statusTone(c.status)}>{c.status}</Badge></td><td><IconButton label={`Open ${c.name}`} onClick={() => openCustomer(c)}><ArrowUpRight size={16} /></IconButton></td></tr>)}</tbody></table></div></Panel>
      <Panel title="Workspace activity" action={<button className="text-button" onClick={() => nav('logs')}>View log <ArrowUpRight size={14} /></button>}><div className="activity-list">{ACTIVITY.slice(0, 3).map((a, i) => <div className="activity-item" key={a.title}><span className={`activity-dot dot-${i}`} /><div><strong>{a.title}</strong><p>{a.text}</p></div><time>{a.time}</time></div>)}</div></Panel></div>
  </>;
}

const LayoutIcon = Activity;

export default OverviewScreen;
