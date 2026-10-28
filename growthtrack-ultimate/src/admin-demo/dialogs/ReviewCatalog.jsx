import React, { useMemo, useState } from 'react';
import { AREA_NAMES } from '../catalog';
import { ArrowRight, ArrowUpRight, Badge, Button, Icon } from '../components';
import { nextPendingReview } from '../models/reviewModel';

const statusText = status => status === 'approved' ? 'Approved' : status === 'changes-requested' ? 'Changes requested' : 'Unreviewed';
export default function ReviewCatalog({ coverage, scope, page, view, nav, exportReview, reviewCount, sessionOnly = false }) {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');
  const [status, setStatus] = useState('all');
  const filtered = useMemo(() => coverage.pages.filter(group => {
    const text = `${group.page.title} ${group.page.area} ${AREA_NAMES[group.page.area]} ${(group.page.aliases || []).join(' ')}`.toLowerCase();
    return (!query.trim() || text.includes(query.trim().toLowerCase())) && (area === 'all' || area === group.page.area) && (status === 'all' || group.targets.some(target => target.status === status));
  }), [coverage, query, area, status]);
  const next = nextPendingReview(coverage, page.id, view);
  return <div className="review-workspace">
    {sessionOnly && <p className="review-storage-warning" role="alert">Your latest reviews are saved for this session only. Browser storage is unavailable or full. Export your review before closing this page.</p>}
    <div className="review-scope"><span className="eyebrow">CURRENT REVIEW SCOPE</span><strong>{scope.theme === 'dark' ? 'Dark' : 'Light'} · {scope.density} · {scope.state}</strong><span>{scope.viewport.width} × {scope.viewport.height} px</span></div>
    <div className="coverage-summary" aria-label="Review coverage for the current scope"><div><strong>{coverage.approved} / {coverage.targets.length}</strong><span>views approved</span></div><div><strong>{coverage.changes}</strong><span>need changes</span></div><div><strong>{coverage.completedPages} / {coverage.pages.length}</strong><span>pages fully reviewed</span></div></div>
    <div className="coverage-actions"><Button variant="primary" icon={ArrowRight} disabled={!next} onClick={() => nav(next.page.id, next.view, true)}>Next unreviewed view</Button><Button onClick={exportReview}>Export review ({reviewCount})</Button></div>
    <div className="review-filters"><label>Filter pages<input aria-label="Filter pages" value={query} onChange={event => setQuery(event.target.value)} placeholder="Page, product, or alias…" /></label><label>Product area<select aria-label="Review product area" value={area} onChange={event => setArea(event.target.value)}><option value="all">All areas</option>{Object.entries(AREA_NAMES).map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label><label>Review status<select aria-label="Review status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option><option value="unreviewed">Unreviewed</option><option value="changes-requested">Changes requested</option><option value="approved">Approved</option></select></label></div>
    <div className="review-catalog">{Object.entries(AREA_NAMES).map(([id, title]) => {
      const groups = filtered.filter(group => group.page.area === id);
      if (!groups.length) return null;
      return <section key={id}><h3>{title}<span>{groups.length}</span></h3>{groups.map(group => <div className="review-catalog-row" key={group.page.id}><button aria-label={`Open ${group.page.title}: ${group.approved} of ${group.targets.length} views approved`} onClick={() => nav(group.page.id, undefined, true)}><Icon name={group.page.id} /><strong>{group.page.title}</strong><small>{group.approved} / {group.targets.length} views approved</small><ArrowUpRight size={14} /></button><div className="view-links">{group.targets.filter(target => status === 'all' || target.status === status).map(target => <button key={target.key} onClick={() => nav(group.page.id, target.view, true)} aria-label={`${group.page.title}, ${target.view || 'default'}, ${statusText(target.status)}`}><span>{target.view || 'default'}</span><Badge tone={target.status === 'approved' ? 'green' : target.status === 'changes-requested' ? 'amber' : 'neutral'}>{statusText(target.status)}</Badge></button>)}</div></div>)}</section>;
    })}{!filtered.length && <div className="review-no-results"><h3>No pages match these filters</h3><Button onClick={() => { setQuery(''); setArea('all'); setStatus('all'); }}>Clear review filters</Button></div>}</div>
    <div className="modal-footnote">Coverage is for the scope above. Other themes, densities, states and window sizes need their own reviews. Reviews stay in this browser; export them to retain a record.</div>
  </div>;
}
