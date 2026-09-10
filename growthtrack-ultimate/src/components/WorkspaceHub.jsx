import React, { Suspense, lazy } from 'react';
import useHashTab, { handleTabKeyDown } from '../hooks/useHashTab';

const Calendar = lazy(() => import('./Calendar'));
const Documents = lazy(() => import('./Documents'));
const Notes = lazy(() => import('./Notes'));

const TABS = [
  { id: 'calendar', label: 'Calendar', description: 'Plan the day' },
  { id: 'documents', label: 'Documents', description: 'Cloud-ready files' },
  { id: 'notes', label: 'Notes', description: 'Markdown knowledge' },
];
const TAB_IDS = TABS.map(item => item.id);

export default function WorkspaceHub({ initialTab = 'calendar' }) {
  const [tab, selectTab] = useHashTab(TAB_IDS, initialTab);

  return (
    <section className="module-page hub-page">
      <div className="page-hero glass-card">
        <span className="eyebrow">Workspace</span>
        <h1 className="text-display">Your operating context</h1>
        <p className="text-secondary">Calendar, documents, and notes are connected as one place to plan, capture, and retrieve.</p>
      </div>

      <div
        className="hub-tabs"
        role="tablist"
        aria-label="Workspace"
        onKeyDown={event => handleTabKeyDown(event, {
          tabs: TABS,
          activeTab: tab,
          selectTab,
          idPrefix: 'workspace-tab',
        })}
      >
        {TABS.map(item => (
          <button
            key={item.id}
            id={`workspace-tab-${item.id}`}
            className={`hub-tab ${tab === item.id ? 'is-active' : ''}`}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls="workspace-tabpanel"
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => selectTab(item.id)}
          >
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </div>

      <div
        id="workspace-tabpanel"
        role="tabpanel"
        aria-labelledby={`workspace-tab-${tab}`}
        tabIndex={0}
      >
        <Suspense fallback={<div className="hub-loading"><div className="spin-ring" /> Loading workspace…</div>}>
          {tab === 'calendar' && <Calendar />}
          {tab === 'documents' && <Documents />}
          {tab === 'notes' && <Notes />}
        </Suspense>
      </div>
    </section>
  );
}
