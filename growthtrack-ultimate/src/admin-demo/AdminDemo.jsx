import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Avatar, Badge, Bell, Button, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, Download, Empty, Icon, IconButton, Leaf,
  Menu, Modal, Moon, Plus, Search, ShieldCheck, Sun, X,
} from './components';
import { AREA_NAMES, DEFAULT_PAGE, PAGES, PAGE_BY_ID, PAGE_VIEWS, REVIEW_STATES, demoHref, resolveDemoRoute, reviewKey, reviewTargets } from './catalog';
import { CUSTOMERS } from './fixtures';
import Screen from './screens';
import CustomerDetail from './dialogs/CustomerDetail';
import EntryFields from './dialogs/EntryFields';
import { normaliseEntry } from './models/entryModel';
import { SAMPLE_FOCUS_HISTORY, createFocusSession, focusRecord } from './models/focusModel';
import { compactReviews, restoreReviews, reviewCoverage } from './models/reviewModel';
import ReviewCatalog from './dialogs/ReviewCatalog';
import { PHYSIQUE_STORAGE_KEY, physiqueSnapshot, restorePhysiqueSession } from './models/physiqueModel';
import useScrollLock from './hooks/useScrollLock';
import WorkspaceNavigation from './WorkspaceNavigation';
import { ScopeBadge, ScopeProvider } from './Scope';
import { screenScope } from './models/screenScope';
import PreviewState from './PreviewState';
import { SAMPLE_NOTIFICATIONS } from './models/activityModel';
import { NOTES } from './models/noteModel';
import { taskRecords } from './models/taskModel';
import { SAMPLE_DATE } from './models/chartModel';
import { REVIEW_VERSION, primaryAction, entryDestination, recordsForPage, hasNativeEntries, searchDemo, validateNewRecord, isNavActive } from './models/workspaceModel';

function readPreference(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; }
}
function savePreference(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function downloadJson(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const SUBTITLES = {
  overview: 'A clear view of your products, your people, and what needs you next.',
  customers: 'Two customer products. One thoughtful admin workspace.',
  finsync: 'Customer accounts, support, and account activity for FinSync.',
  oxfin: 'Customer accounts, support, and account activity for OxFin.',
  wellness: 'Your health, routines, and everyday progress, thoughtfully connected.',
  equity: 'Your watchlist, market context, and research in one native workspace.',
  forex: 'A considered workspace for currency research and model evaluation.',
  family: 'Your people, your memories, and the moments that bring you together.',
  tasks: 'Make space for the things that move your day forward.',
  profile: 'A few preferences to make this workspace feel like yours.',
};


export default function AdminDemo() {
  const [route, setRoute] = useState(() => resolveDemoRoute(window.location.hash));
  const [theme, setTheme] = useState(() => readPreference('gt-demo-theme', 'light') === 'dark' ? 'dark' : 'light');
  const [density, setDensity] = useState(() => readPreference('gt-demo-density', 'comfortable') === 'compact' ? 'compact' : 'comfortable');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [previewState, setPreviewState] = useState('populated');
  const [customers, setCustomers] = useState(CUSTOMERS);
  const [added, setAdded] = useState({});
  const [taskStatus, setTaskStatus] = useState({});
  const [actionOverrides, setActionOverrides] = useState({});
  const [notifications, setNotifications] = useState(() => [...SAMPLE_NOTIFICATIONS]);
  const [notificationPreferences, setNotificationPreferences] = useState({ email: false, reminders: true });
  const [noteDrafts, setNoteDrafts] = useState({});
  const [focusSession, setFocusSession] = useState(createFocusSession);
  const [focusHistory, setFocusHistory] = useState(() => [...SAMPLE_FOCUS_HISTORY]);
  const focusSequence = useRef(0);
  const [physiqueSession, setPhysiqueSession] = useState(() => restorePhysiqueSession(readPreference(PHYSIQUE_STORAGE_KEY, null)));
  const [formError, setFormError] = useState('');
  const [readyVariant, setReadyVariant] = useState('');
  const [reviews, setReviews] = useState(() => restoreReviews(readPreference(REVIEW_VERSION, {})));
  const [reviewSessionOnly, setReviewSessionOnly] = useState(false);
  const [toast, setToast] = useState('');
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const mainRef = useRef(null);
  const sidebarRef = useRef(null);
  const menuRef = useRef(null);
  const restoreMenuOnClose = useRef(false);
  const navigationState = useRef(null);
  const drawerOpen = sidebarOpen && viewport.width < 960;
  useScrollLock(drawerOpen);
  const closeNavigation = () => { restoreMenuOnClose.current = true; setSidebarOpen(false); };
  const { page, view } = route;
  const publicPage = page.area === 'public';
  const scope = screenScope(page, view, previewState);
  const action = primaryAction(page);
  const variantKey = page.id + ':' + view;
  const contentReady = previewState !== 'populated' || readyVariant === variantKey;
  const views = PAGE_VIEWS;
  const viewIndex = views.findIndex(v => v.page.id === page.id && v.view === view);
  const key = reviewKey(page, view, theme, previewState, `${viewport.width}x${viewport.height}`, density);
  const reviewScope = useMemo(() => ({ theme, state: previewState, density, viewport }), [theme, previewState, density, viewport]);
  const coverage = useMemo(() => reviewCoverage(reviews, reviewScope), [reviews, reviewScope]);
  const review = reviews[key];
  const reviewCount = Object.keys(reviews).length;

  const nav = (id, nextView, preservePreview = false) => { restoreMenuOnClose.current = false; const hash = demoHref(id, nextView); navigationState.current = preservePreview ? { hash, state: previewState } : null; window.location.hash = hash; setSidebarOpen(false); setModal(null); setQuery(''); };
  useEffect(() => {
    const change = () => { setRoute(resolveDemoRoute(window.location.hash)); if (navigationState.current?.hash !== window.location.hash) navigationState.current = null; setPreviewState(navigationState.current?.state || 'populated'); setSidebarOpen(false); setModal(null); };
    window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => { document.title = `GrowthTrack · ${page.title} · Design preview`; mainRef.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [page.id, view]);
  useEffect(() => { savePreference('gt-demo-theme', theme); document.documentElement.style.colorScheme = theme; }, [theme]);
  useEffect(() => { savePreference('gt-demo-density', density); }, [density]);
  useEffect(() => {
    const resize = () => { setViewport({ width: window.innerWidth, height: window.innerHeight }); if (window.innerWidth >= 960) setSidebarOpen(false); };
    window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setModal({ type: 'search' }); setQuery(''); }
      if (!drawerOpen || modal) return;
      if (e.key === 'Escape') { e.preventDefault(); closeNavigation(); }
      if (e.key === 'Tab') {
        const elements = [...sidebarRef.current.querySelectorAll('a[href], button:not([disabled])')];
        const first = elements[0], last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [drawerOpen, modal]);
  useEffect(() => {
    if (drawerOpen && !modal) sidebarRef.current?.querySelector('[data-nav-close]')?.focus();
    else if (restoreMenuOnClose.current && !modal) menuRef.current?.focus();
    if (!drawerOpen) restoreMenuOnClose.current = false;
  }, [drawerOpen, modal]);
  useEffect(() => { setFormError(''); if (modal) setSidebarOpen(false); }, [modal]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4200); return () => clearTimeout(timer); }, [toast]);

  function markReview(status, note = '', target = { page: page.id, view, theme, state: previewState, density, viewport }) {
    const targetPage = PAGE_BY_ID[target.page];
    const targetKey = reviewKey(targetPage, target.view, target.theme, target.state, `${target.viewport.width}x${target.viewport.height}`, target.density);
    const entry = { ...target, path: targetPage.path, status, note: note.slice(0, 4000), reviewedAt: new Date().toISOString(), version: REVIEW_VERSION };
    const next = { ...reviews, [targetKey]: entry }; setReviews(next);
    const stored = savePreference(REVIEW_VERSION, compactReviews(next)); setReviewSessionOnly(!stored);
    setToast(stored ? status === 'approved' ? 'This view is approved in this browser.' : 'Your change request has been saved in this browser.' : 'Saved for this session. Browser storage is unavailable; export your review.');
  }
  function changeFocusSession(next) {
    if (next.startedAt !== null && !next.runId) next = { ...next, runId: 'focus-local-' + ++focusSequence.current };
    if (next.completedAt && !focusSession.completedAt) {
      const record = focusRecord(focusSession, next.completedAt);
      if (record) setFocusHistory(previous => previous.some(row => row.id === record.id) ? previous : [record, ...previous]);
    }
    setFocusSession(next);
  }
  useEffect(() => {
    if (focusSession.deadline === null || focusSession.completedAt) return undefined;
    const timer = setTimeout(() => changeFocusSession({ ...focusSession, deadline: null, remainingSeconds: 0, completedAt: focusSession.deadline }), Math.max(0, focusSession.deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [focusSession]);
  const savePhysique = () => {
    const snapshot = physiqueSnapshot(physiqueSession);
    if (!savePreference(PHYSIQUE_STORAGE_KEY, snapshot)) return false;
    setPhysiqueSession(current => ({ ...current, savedContexts: snapshot.contexts, savedAt: snapshot.savedAt }));
    return true;
  };
  const addRecord = (type, product, date) => setModal({ type: 'add', recordType: type, product, date, origin: page.id });
  function submitRecord(e) {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const values = Object.fromEntries(data.entries());
    const error = validateNewRecord(values, customers, modal.recordType) || (modal.product && values.product !== modal.product ? 'Choose the product for this customer directory.' : '');
    if (error) { setFormError(error); return; }
    const title = String(values.title).trim();
    if (modal.recordType === 'customer') {
      const product = String(data.get('product')); const id = `${product === 'FinSync' ? 'FS' : 'OX'}-DEMO-${customers.length + 1}`;
      setCustomers(c => [{ id, name: title, email: String(data.get('email')).trim(), product, plan: String(data.get('plan')), status: 'Invited', joined: '28 Oct 2026', activity: 'Just now', initials: title.split(' ').map(n => n[0]).slice(0, 2).join(''), color: 'sage', issue: 'Sample invitation pending' }, ...c]);
      setToast('Sample customer added to the demo. No invitation was sent.');
    } else {
      const destination = entryDestination(modal.recordType, modal.origin);
      setAdded(a => ({ ...a, [destination]: [...(a[destination] || []), normaliseEntry(modal.recordType, values, modal.origin, destination + '-' + Date.now() + '-' + (a[destination]?.length || 0))] }));
      setToast('Sample entry added for this session.');
    }
    setModal(null);
  }
  const exportReview = () => downloadJson('growthtrack-ui-review.json', { version: REVIEW_VERSION, exportedAt: new Date().toISOString(), approvalScope: 'Only the explicitly reviewed page, view, theme, state, density and recorded viewport.', liveCustomerSystemsConnected: false, totalPages: PAGES.length, baseVariantsExcludingViewport: reviewTargets().length, reviews });
  const searchResults = searchDemo(PAGES, customers, query, { tasks: taskRecords(added.tasks || [], taskStatus), notes: [...NOTES, ...(added.notes || [])].map(note => ({ ...note, notes: noteDrafts[note.id] ?? note.notes })) });
  const searchPages = searchResults.pages;

  return <ScopeProvider value={scope}><div className={`portal${publicPage ? ' portal-public' : ''}`} data-theme={theme} data-density={density}>
    <a className="skip-link" href="#main-preview" onClick={event => { event.preventDefault(); mainRef.current?.focus(); }}>Skip to page content</a>
    {drawerOpen && <button className="sidebar-scrim" aria-label="Close navigation overlay" tabIndex={-1} onClick={closeNavigation} />}
    <aside hidden={publicPage} id="main-navigation" ref={sidebarRef} className={`sidebar${drawerOpen ? ' sidebar-open' : ''}`} aria-label="Main navigation" role={drawerOpen ? 'dialog' : undefined} aria-modal={drawerOpen || undefined} aria-hidden={viewport.width < 960 && !drawerOpen ? true : undefined} inert={viewport.width < 960 && !drawerOpen ? true : undefined}>
      <IconButton className="icon-button nav-close" label="Close navigation" hidden={viewport.width >= 960} data-nav-close onClick={closeNavigation}><X size={20} /></IconButton>
      <button className="brand" onClick={() => nav('overview')} aria-label="GrowthTrack home"><span className="brand-symbol"><Leaf size={23} strokeWidth={1.8} /></span><span>growthtrack<span>ULTIMATE</span></span></button>
      <button className="workspace-switcher" onClick={() => nav('apps')}><span className="workspace-initial">G</span><span><strong>My workspace</strong><small>Owner · Administration</small></span><ChevronDown size={14} /></button>
      <WorkspaceNavigation page={page} onNavigate={() => { restoreMenuOnClose.current = false; setSidebarOpen(false); }} />
      <div className="sidebar-bottom"><button className="all-pages-button" onClick={() => { setModal({ type: 'review' }); }}><Icon name="overview" size={16} />All pages & review<span>{PAGES.length}</span></button><a className={page.id === 'profile' ? 'nav-link nav-active' : 'nav-link'} aria-current={page.id === 'profile' ? 'location' : undefined} href={demoHref('profile', 'appearance')} onClick={() => setSidebarOpen(false)}><Icon name="profile" />Settings</a><a className={page.id === 'help' ? 'nav-link nav-active' : 'nav-link'} aria-current={page.id === 'help' ? 'page' : undefined} href={demoHref('help')} onClick={() => setSidebarOpen(false)}><Icon name="help" />Help & documentation</a><div className="owner-profile"><Avatar name="Workspace owner" initials="WO" color="sage" small /><span><strong>Workspace owner</strong><small>Sample administrator</small></span><ShieldCheck size={16} /></div></div>
    </aside>
    <div className="portal-body" inert={drawerOpen ? true : undefined}>
      <header hidden={publicPage} className="topbar"><div className="breadcrumb"><IconButton ref={menuRef} label="Toggle navigation" hidden={viewport.width >= 960} aria-controls="main-navigation" aria-expanded={drawerOpen} onClick={() => setSidebarOpen(!drawerOpen)}><Menu size={18} /></IconButton><span>Workspace</span><ChevronRight size={13} /><strong>{AREA_NAMES[page.area]}</strong></div><div className="topbar-tools"><span className="preview-indicator"><span />Design preview <i>· Sample data</i></span><button className="global-search" onClick={() => { setModal({ type: 'search' }); setQuery(''); }}><Search size={15} /><span>Search anything</span><kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'}</kbd></button><IconButton label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</IconButton><IconButton label="View notifications" onClick={() => nav('notifications')}><span className="notification-icon"><Bell size={18} />{notifications.some(row => !row.read) && <i />}</span></IconButton><IconButton label="Account options" onClick={() => setModal({ type: 'account' })}><Avatar name="Workspace owner" initials="WO" small /></IconButton></div></header>
      {publicPage && <header className="public-brand-header"><button className="text-button" onClick={() => nav('welcome')}><Leaf size={20} />GrowthTrack Ultimate</button><IconButton label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</IconButton></header>}
      <main id="main-preview" ref={mainRef} className="page-content" tabIndex={-1}>
        <div className="page-heading"><div><div className="eyebrow">{page.id === 'overview' ? 'WEDNESDAY, 28 OCTOBER 2026' : AREA_NAMES[page.area].toUpperCase()}</div><h1>{page.id === 'overview' ? 'Your workspace, in perspective.' : page.title}</h1><p>{SUBTITLES[page.id] || `A considered space for ${page.title.toLowerCase()}, with everything within reach.`}</p></div><div className="page-actions"><ScopeBadge />{page.id === 'overview' && <Button icon={CalendarIcon} onClick={() => nav('calendar')}>View calendar</Button>}{action && <Button icon={Plus} variant="primary" onClick={() => addRecord(action.type, action.product, page.id === 'calendar' ? SAMPLE_DATE : undefined)}>{action.label}</Button>}</div></div>
        {page.views.length > 0 && <nav className={`page-tabs${['transactions', 'actions', 'shopping'].includes(page.id) ? ' page-segments' : ''}`} aria-label={`${page.title} views`}>{page.views.map(v => <a key={v} href={demoHref(page.id, v)} aria-current={view === v ? 'page' : undefined} className={view === v ? 'tab-active' : ''}>{v === '3d' ? '3D workspace' : v === 'prs' ? 'Personal records' : v === '1rm' ? '1RM calculator' : v.charAt(0).toUpperCase() + v.slice(1)}</a>)}</nav>}
        {previewState === 'populated' ? <Screen key={page.id} page={page} variantKey={variantKey} onReady={setReadyVariant} view={view} nav={nav} customers={customers} openCustomer={customer => setModal({ type: 'customer', customer })} updateCustomer={(updated, message) => { setCustomers(previous => previous.map(customer => customer.id === updated.id ? updated : customer)); setToast(message || 'Sample customer updated for this session.'); }} openRecord={record => setModal({ type: 'record', record })} addRecord={addRecord} added={recordsForPage(page, added)} familyEvents={(added.calendar || []).filter(record => record.origin === 'family')} subscriptionEntries={added.subscriptions || []} focusSession={focusSession} onFocusSessionChange={changeFocusSession} focusHistory={focusHistory} physiqueSession={physiqueSession} onPhysiqueChange={setPhysiqueSession} onPhysiqueSave={savePhysique} noteDrafts={noteDrafts} onNoteChange={(id, text) => setNoteDrafts(previous => ({ ...previous, [id]: text }))} actionOverrides={actionOverrides} onActionOverridesChange={setActionOverrides} notifications={notifications} onNotificationsChange={setNotifications} notificationPreferences={notificationPreferences} onNotificationPreferencesChange={setNotificationPreferences} taskStatus={taskStatus} onTaskStatusChange={(title, complete) => setTaskStatus(previous => ({ ...previous, [title]: complete }))} theme={theme} setTheme={setTheme} density={density} setDensity={setDensity} /> : <PreviewState state={previewState} page={page} onReset={() => setPreviewState('populated')} onBack={() => nav('overview')} />}
        {previewState === 'populated' && !hasNativeEntries(page) && (added[page.id] || []).length > 0 && <section className="session-records" aria-label="Entries created in this demo"><h2>Added in this session</h2>{added[page.id].map((record, i) => <button key={i} onClick={() => setModal({ type: 'record', record })}><CheckCircle2 size={16} /><strong>{record.title}</strong><span>{record.type}</span><ArrowUpRight size={15} /></button>)}</section>}
        <div className="page-footnote"><Leaf size={13} /><span>GrowthTrack Ultimate</span><span>Local design preview · Fictional data · Customer APIs are not connected</span></div>
      </main>
      <footer className="review-bar" aria-label="Design review controls"><button className="review-page-counter" onClick={() => setModal({ type: 'review' })}><span className="review-symbol"><Check size={14} /></span><span><strong>Page-by-page review</strong><small>{coverage.approved} of {coverage.targets.length} views approved · {density}</small></span></button><div className="review-controls"><label><span className="sr-only">Preview state</span><select aria-label="Preview state" value={previewState} onChange={e => setPreviewState(e.target.value)}>{REVIEW_STATES.map(s => <option value={s} key={s}>{s.charAt(0).toUpperCase() + s.slice(1)} state</option>)}</select></label><Button onClick={() => setModal({ type: 'feedback', target: { page: page.id, view, theme, state: previewState, density, viewport: { ...viewport } }, note: review?.note || '' })}>Request changes</Button><Button variant={review?.status === 'approved' ? 'approved-button' : 'primary'} icon={Check} disabled={!contentReady} title={contentReady ? 'Approve this page, view, theme and state' : 'Wait for the page to finish loading'} onClick={() => markReview('approved')}>{review?.status === 'approved' ? 'View approved' : 'Approve this view'}</Button><div className="review-paging"><IconButton label="Previous view" onClick={() => { const next = views[(viewIndex - 1 + views.length) % views.length]; nav(next.page.id, next.view); }}><ChevronLeft size={17} /></IconButton><span>{viewIndex + 1} / {views.length}</span><IconButton label="Next view" onClick={() => { const next = views[(viewIndex + 1) % views.length]; nav(next.page.id, next.view); }}><ChevronRight size={17} /></IconButton></div></div></footer>
    </div>
    {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}<IconButton label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></IconButton></div>}

    {modal && <Modal focusKey={modal.type} title={modal.type === 'search' ? 'Find your way' : modal.type === 'review' ? 'Every page, in perspective' : modal.type === 'feedback' ? 'What would make this view better?' : modal.type === 'account' ? 'Account and appearance' : modal.type === 'customer' ? 'Customer profile' : modal.type === 'add' ? `Add sample ${modal.recordType}` : modal.record?.title || modal.record?.name || 'Record details'} wide={modal.type === 'review'} onClose={() => setModal(null)}>
      {modal.type === 'search' && <><label className="search-field command-input"><Search size={19} /><input aria-label="Search pages, customers, tasks and notes" autoFocus placeholder="Search a page, customer, task, or note…" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="command-results">{searchPages.slice(0, 12).map(p => <button key={p.id} onClick={() => nav(p.id)}><Icon name={p.id} /><span><strong>{p.title}</strong><small>{AREA_NAMES[p.area]}</small></span><ArrowRight size={15} /></button>)}{query && searchResults.customers.slice(0, 4).map(c => <button key={c.id} onClick={() => setModal({ type: 'customer', customer: c })}><Avatar {...c} small /><span><strong>{c.name}</strong><small>{c.product} · Sample customer</small></span><ArrowUpRight size={15} /></button>)}{searchResults.tasks.slice(0, 4).map(task => <button key={task.id} onClick={() => setModal({ type: 'record', record: { ...task, type: 'Sample task' } })}><Icon name="tasks" /><span><strong>{task.title}</strong><small>Sample task · {task.status}</small></span><ArrowRight size={15} /></button>)}{searchResults.notes.slice(0, 4).map(note => <button key={note.id} onClick={() => setModal({ type: 'record', record: { ...note, type: 'Sample note' } })}><Icon name="notes" /><span><strong>{note.title}</strong><small>Sample note · Session draft</small></span><ArrowRight size={15} /></button>)}{!searchPages.length && !searchResults.customers.length && !searchResults.tasks.length && !searchResults.notes.length && <Empty title="No results yet" description="Try a page name, a feature, or a sample customer." />}</div><div className="modal-footnote">Ctrl / ⌘ K to search · Esc to close</div></>}
      {modal.type === 'account' && <div className="dialog-form"><div className="profile-card"><Avatar name="Workspace owner" initials="WO" /><div><strong>Sample workspace owner</strong><p className="muted small">Local design workspace</p></div></div><label>Theme<select aria-label="Account theme" value={theme} onChange={event => setTheme(event.target.value)}><option value="light">Light workspace</option><option value="dark">Dark workspace</option></select></label><label>Information density<select aria-label="Account information density" value={density} onChange={event => setDensity(event.target.value)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><div className="button-group"><Button onClick={() => nav('profile', 'appearance')}>Open settings</Button><Button onClick={() => nav('notifications')}>Open notifications</Button><Button disabled aria-describedby="sample-account-note">Sign out</Button></div><p id="sample-account-note" className="muted small">This demo uses a sample account and does not create an authenticated session.</p></div>}
      {modal.type === 'review' && <ReviewCatalog coverage={coverage} scope={reviewScope} page={page} view={view} nav={nav} exportReview={exportReview} reviewCount={reviewCount} sessionOnly={reviewSessionOnly} />}
      {modal.type === 'feedback' && <form className="dialog-form" onSubmit={e => { e.preventDefault(); const note = String(new FormData(e.currentTarget).get('note') || '').trim(); if (!note) { setFormError('Describe the change you want before saving feedback.'); return; } markReview('changes-requested', note, modal.target); setModal(null); }}><p className="muted">{PAGE_BY_ID[modal.target.page].title} · {modal.target.view || 'default'} · {modal.target.theme} · {modal.target.state} · {modal.target.density} · {modal.target.viewport.width} × {modal.target.viewport.height} px</p>{formError && <p className="form-error" role="alert">{formError}</p>}<label>Your feedback<textarea name="note" autoFocus required maxLength={4000} rows={5} defaultValue={modal.note} placeholder="Spacing, colours, content, interactions…" /></label><div className="dialog-actions"><Button onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" type="submit">Save feedback locally</Button></div></form>}
      {modal.type === 'customer' && <CustomerDetail customer={customers.find(c => c.id === modal.customer.id) || modal.customer} onUpdate={(updated, message) => { setCustomers(c => c.map(r => r.id === updated.id ? updated : r)); setToast(message || 'Sample customer updated in this session.'); }} />}
      {modal.type === 'add' && <form className="dialog-form" onSubmit={submitRecord}><div className="quiet-note">Fictional demo entry. No connected service will be contacted.</div>{formError && <p className="form-error" role="alert">{formError}</p>}<label>{modal.recordType === 'customer' ? 'Customer name' : 'Title'}<input name="title" required maxLength={100} autoFocus placeholder={modal.recordType === 'customer' ? 'Example customer' : 'Give it a clear name'} /></label>{modal.recordType === 'customer' ? <><label>Sample email<input type="email" name="email" required placeholder="customer@example.test" /></label><div className="two-columns"><label>Product<select name="product" defaultValue={modal.product || 'FinSync'}>{(modal.product ? [modal.product] : ['FinSync', 'OxFin']).map(product => <option key={product}>{product}</option>)}</select></label><label>Plan<select name="plan"><option>Starter</option><option>Plus</option><option>Premium</option></select></label></div></> : <EntryFields type={modal.recordType} date={modal.date} />}<div className="dialog-actions"><Button onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" type="submit">Add to demo</Button></div></form>}
      {modal.type === 'record' && <div className="record-details"><Badge>Sample record</Badge><dl className="definition-list">{Object.entries(modal.record || {}).filter(([, value]) => typeof value === 'string' || typeof value === 'number').map(([label, value]) => <div key={label}><dt>{label.charAt(0).toUpperCase() + label.slice(1)}</dt><dd>{value}</dd></div>)}</dl><div className="quiet-note">This record is part of the design demo. No external data or private file is attached.</div></div>}
    </Modal>}
  </div></ScopeProvider>;
}
function CalendarIcon(props) { return <Icon name="calendar" {...props} />; }
