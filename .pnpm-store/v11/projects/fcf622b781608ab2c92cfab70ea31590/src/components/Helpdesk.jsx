import React, { useMemo, useState } from 'react';
import { BookOpen, Search, ChevronDown, CheckCircle2 } from 'lucide-react';

const ARTICLES = [
  { id: 'start', section: 'Getting started', title: 'How GrowthTrack saves your data', body: 'Your workspace is saved locally and, when you are signed in, synchronized with the API database. Restarting the UI or server does not clear your profile, goals, logs, or plans.' },
  { id: 'themes', section: 'Getting started', title: 'Switch between light and dark themes', body: 'Open the appearance control in the header or Profile & Settings. Choose Light or Dark and a palette. The choice is stored with your workspace preferences.' },
  { id: 'physique', section: 'Health & physique', title: 'Use the Physique workspace', body: 'Blueprint stores measurements and targets. 3D Mirror turns those targets into a visual body model. Save targets first, then use the comparison controls to track change over time.' },
  { id: 'entertainment', section: 'Life systems', title: 'Track entertainment', body: 'Add a title manually, choose its service, and save your progress. Connectors for Netflix, Prime Video, ZEE5, Hotstar, and other services require an approved integration or exported watch history; the app never asks for streaming passwords.' },
  { id: 'sync', section: 'Life systems', title: 'Sync calendar and cloud documents', body: 'Calendar and Documents are ready for durable app storage. Google Calendar, iCloud, Drive, and Dropbox sync should be enabled through OAuth connectors so permissions can be revoked safely.' },
  { id: 'logs', section: 'Trust & privacy', title: 'Understand audit and session logs', body: 'Audit logs record create, update, delete, sync, navigation, and authentication events. Session logs record start, validation, refresh, and end events. These records are stored on the API database and are separate from your personal workspace data.' },
];

export default function Helpdesk() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState('start');
  const results = useMemo(() => ARTICLES.filter((article) => `${article.title} ${article.body} ${article.section}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <section className="module-page helpdesk-page">
      <div className="page-hero glass-card">
        <div className="eyebrow"><BookOpen size={14} /> Helpdesk & docs</div>
        <h1 className="text-display">Understand your workspace</h1>
        <p className="text-secondary">Short, practical answers for data, themes, integrations, logs, and the four Ultimate workspaces.</p>
        <label className="helpdesk-search"><Search size={17} /><input aria-label="Search help articles" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help articles…" /></label>
      </div>
      <div className="helpdesk-grid">
        <div className="helpdesk-list">
          {results.map((article) => (
            <article className={`helpdesk-article glass-card ${open === article.id ? 'is-open' : ''}`} key={article.id}>
              <button className="helpdesk-article__toggle" onClick={() => setOpen(open === article.id ? '' : article.id)} aria-expanded={open === article.id}>
                <span><small>{article.section}</small><strong>{article.title}</strong></span><ChevronDown size={17} />
              </button>
              {open === article.id && <p className="helpdesk-article__body">{article.body}</p>}
            </article>
          ))}
          {!results.length && <div className="empty-state"><CheckCircle2 size={24} /><p>No article matches that search.</p></div>}
        </div>
        <aside className="glass-card helpdesk-aside"><span className="eyebrow">Need a plan?</span><h3>Start with three signals</h3><p className="text-secondary">Set one physique target, one weekly goal, and one calendar commitment. Analytics can then forecast progress from real activity instead of empty assumptions.</p><button className="btn-primary" onClick={() => setQuery('')}>Browse all docs</button></aside>
      </div>
    </section>
  );
}
