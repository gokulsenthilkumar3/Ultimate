import React, { useId, useState } from 'react';
import { Avatar, Badge, Button } from '../components';
import { statusTone } from '../screens/screenHelpers';

export default function CustomerDetail({ customer, onUpdate }) {
  const prefix = useId();
  const [tab, setTab] = useState('Profile');
  const [plan, setPlan] = useState(customer.plan);
  const [note, setNote] = useState('');
  const notes = customer.supportNotes || [];
  return <div className="customer-detail">
    <div className="customer-hero"><Avatar {...customer} /><div><h3>{customer.name}</h3><p>{customer.email}</p><span className="provenance-chip">{customer.id} · {customer.product} · Local demo</span></div><Badge tone={statusTone(customer.status)}>{customer.status}</Badge></div>
    <div className="local-tabs" role="tablist" aria-label="Customer profile sections">{['Profile', 'Activity', 'Support notes'].map(label => <button key={label} role="tab" id={`${prefix}-customer-tab-${label.replaceAll(' ', '-')}`} aria-selected={tab === label} aria-controls={`${prefix}-customer-tab-panel`} className={tab === label ? 'selected' : ''} onClick={() => setTab(label)} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = ['Profile', 'Activity', 'Support notes'];
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setTab(tabs[next]); event.currentTarget.parentElement.children[next].focus();
    }} tabIndex={tab === label ? 0 : -1}>{label}</button>)}</div>
    <div id={`${prefix}-customer-tab-panel`} role="tabpanel" aria-labelledby={`${prefix}-customer-tab-${tab.replaceAll(' ', '-')}`}>
      {tab === 'Profile' ? <><dl className="definition-list"><div><dt>Product</dt><dd>{customer.product}</dd></div><div><dt>Joined</dt><dd>{customer.joined}</dd></div><div><dt>Last activity</dt><dd>{customer.activity}</dd></div><div><dt>Open request</dt><dd>{customer.issue}</dd></div></dl><form className="dialog-form" onSubmit={event => { event.preventDefault(); onUpdate({ ...customer, plan }); }}><label>Sample plan<select value={plan} onChange={event => setPlan(event.target.value)}><option>Starter</option><option>Plus</option><option>Premium</option></select></label><Button type="submit" variant="primary" disabled={plan === customer.plan}>Update sample plan</Button></form></> : tab === 'Activity' ? <div className="timeline"><div><time>Today</time><span className="timeline-node" /><article><h3>Account viewed</h3><p>Sample customer activity</p></article></div><div><time>{customer.joined}</time><span className="timeline-node" /><article><h3>Customer joined {customer.product}</h3><p>{customer.plan} plan</p></article></div></div> : <><div className="support-notes">{notes.length ? notes.map((text, i) => <article key={i}><strong>Sample administrator</strong><p>{text}</p></article>) : <p className="muted">No sample notes yet.</p>}</div><form className="dialog-form" onSubmit={event => {
        event.preventDefault(); if (!note.trim()) return;
        onUpdate({ ...customer, supportNotes: [...notes, note.trim()] }, 'Sample support note saved for this session.'); setNote('');
      }}><label>Internal sample note<textarea value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={2000} required /></label><Button type="submit" disabled={!note.trim()}>Add local note</Button></form></>}
    </div>
    <p className="modal-footnote">Preview only. No live account, payment, or permission is changed.</p>
  </div>;
}
