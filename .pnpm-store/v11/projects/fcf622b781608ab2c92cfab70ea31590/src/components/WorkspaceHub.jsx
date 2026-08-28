import React, { Suspense, lazy, useState } from 'react';
const Calendar = lazy(() => import('./Calendar'));
const Documents = lazy(() => import('./Documents'));
const Notes = lazy(() => import('./Notes'));
const TABS = [{ id: 'calendar', label: 'Calendar', description: 'Plan the day' }, { id: 'documents', label: 'Documents', description: 'Cloud-ready files' }, { id: 'notes', label: 'Notes', description: 'Markdown knowledge' }];
export default function WorkspaceHub({ initialTab = 'calendar' }) {
  const [tab, setTab] = useState(initialTab);
  return <section className="module-page hub-page"><div className="page-hero glass-card"><span className="eyebrow">Workspace</span><h1 className="text-display">Your operating context</h1><p className="text-secondary">Calendar, documents, and notes are connected as one place to plan, capture, and retrieve.</p></div><div className="hub-tabs" role="tablist" aria-label="Workspace">{TABS.map(item => <button key={item.id} className={`hub-tab ${tab === item.id ? 'is-active' : ''}`} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div><Suspense fallback={<div className="hub-loading"><div className="spin-ring" /> Loading workspace…</div>}>{tab === 'calendar' && <Calendar />}{tab === 'documents' && <Documents />}{tab === 'notes' && <Notes />}</Suspense></section>;
}
