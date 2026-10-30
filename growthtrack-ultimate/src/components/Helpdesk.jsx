import React, { useMemo, useState, useEffect } from 'react';
import {
  BookOpen, Search, ChevronDown, ChevronRight, Zap, ShieldCheck,
  LifeBuoy, FlaskConical, ArrowRight, Terminal, Cpu, Database,
  PlugZap, HelpCircle, Activity, CheckCircle2, X, Lightbulb,
  Layers, BarChart3, RefreshCw, Globe
} from 'lucide-react';
import { apiRequest } from '../lib/apiClient';
import PageHeader from './ui/PageHeader';

// ── Content ──────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'start',
    icon: <Zap size={16} />,
    color: 'var(--gt-character-yellow)',
    label: 'Getting started',
    articles: [
      {
        id: 'data',
        title: 'How GrowthTrack saves your data',
        body: 'Your workspace is saved locally and, when you are signed in, synchronized with the API database. Restarting the UI or server does not clear your profile, goals, logs, or plans. Data is persisted in SQLite via Prisma on the Express backend.',
      },
      {
        id: 'themes',
        title: 'Switch between light and dark themes',
        body: 'Open the appearance control in the header or Profile & Settings → Appearance. Choose Light, Dark, or AMOLED and select a colour palette. Your preference is written to the API profile so it follows you across sessions.',
      },
      {
        id: 'kinetic',
        title: 'Pinto Kinetic UI — what it is',
        body: 'Pinto Kinetic is the default presentation layer (v5). It uses crisp borders with offset shadows, bold tabular numbers, pill-shaped buttons with 3-pixel lift shadows, and spring-physics micro-animations governed by a motion budget so heavy pages stay smooth. Switch to Playful style from Profile & Settings → Appearance if you prefer the illustrated character aesthetic.',
      },
    ],
  },
  {
    id: 'health',
    icon: <Activity size={16} />,
    color: 'var(--gt-character-mint)',
    label: 'Health & physique',
    articles: [
      {
        id: 'physique',
        title: 'Use the Physique workspace',
        body: 'Blueprint stores measurements and targets. 3D Mirror turns those targets into a visual body model. Save targets first, then use the comparison controls to track change over time. The 3D model is rendered with Three.js and updates when you save new measurements.',
      },
      {
        id: 'training',
        title: 'Log workouts and routines',
        body: 'Training lets you build routines from exercises, log each set with reps, weight and duration, and see progressive overload over time. Strength Metrics aggregates those sessions into estimated 1-rep maxes and weekly volume charts.',
      },
    ],
  },
  {
    id: 'life',
    icon: <Layers size={16} />,
    color: 'var(--gt-character-coral)',
    label: 'Life systems',
    articles: [
      {
        id: 'entertainment',
        title: 'Track entertainment',
        body: 'Add a title manually, choose its service, and save your progress. Connectors for Netflix, Prime Video, ZEE5, Hotstar, and other services require an approved integration or exported watch history; the app never asks for streaming passwords.',
      },
      {
        id: 'sync',
        title: 'Sync calendar and cloud documents',
        body: 'Calendar and Documents are ready for durable app storage. Google Calendar, iCloud, Drive, and Dropbox sync should be enabled through OAuth connectors so permissions can be revoked safely at any time.',
      },
      {
        id: 'goals',
        title: 'Goals, habits and tasks',
        body: 'Goals Dashboard tracks milestones with progress percentages. Habits Matrix builds streaks from daily check-ins. Tasks uses a Kanban / timeline view. All three share the same notification pipeline so due-date reminders reach the same inbox.',
      },
    ],
  },
  {
    id: 'finance',
    icon: <BarChart3 size={16} />,
    color: 'var(--gt-character-lilac)',
    label: 'Finance & markets',
    articles: [
      {
        id: 'budget',
        title: 'Budget, transactions and SIP',
        body: 'Finance Overview shows income versus expense with category breakdown. Budgeting sets monthly caps. Transactions is the raw ledger. SIP Calculator models systematic investment growth using compound-interest simulations. None of these route to a live bank API by default.',
      },
      {
        id: 'portfolio',
        title: 'Portfolio and equity',
        body: 'Portfolio tracks holdings you enter manually. NiftyLens (Equity module) shows live NSE/BSE quotes via the gateway proxy. Ensure the Equity service is running on port 5105 for live market data.',
      },
    ],
  },
  {
    id: 'trust',
    icon: <ShieldCheck size={16} />,
    color: '#85D9B8',
    label: 'Trust & privacy',
    articles: [
      {
        id: 'logs',
        title: 'Understand audit and session logs',
        body: 'Audit logs record create, update, delete, sync, navigation, and authentication events. Session logs record start, validation, refresh, and end events. These records are stored on the API database and are separate from your personal workspace data.',
      },
      {
        id: 'auth',
        title: 'Authentication and owner sessions',
        body: 'Authentication is local-first using bcrypt-hashed passwords stored in SQLite. JWTs are signed by the Express server and validated on every protected API call. There is no third-party auth provider in the default self-hosted configuration.',
      },
    ],
  },
];

const ALL_ARTICLES = SECTIONS.flatMap(s =>
  s.articles.map(a => ({ ...a, section: s.label, sectionId: s.id, sectionColor: s.color, icon: s.icon }))
);

const QUICK_LINKS = [
  { label: 'Profile & Settings', href: '/hub/settings', icon: <Cpu size={15} /> },
  { label: 'Databases', href: '/hub/databases', icon: <Database size={15} /> },
  { label: 'Activity Logs', href: '/hub/logs', icon: <Activity size={15} /> },
  { label: 'About & Version', href: '/hub/about', icon: <Globe size={15} /> },
  { label: 'App Launcher', href: '/hub/apps', icon: <PlugZap size={15} /> },
];

// ── Diagnostics ───────────────────────────────────────────────────────────────

const DIAG_PROBES = [
  { id: 'api', label: 'Core API', url: '/api/health', icon: <Terminal size={14} /> },
  { id: 'db', label: 'Database', url: '/api/health', key: 'database', icon: <Database size={14} /> },
  { id: 'auth', label: 'Auth Layer', url: '/api/auth/me', icon: <ShieldCheck size={14} /> },
];

function useDiagnostics(active) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    const next = {};
    for (const probe of DIAG_PROBES) {
      const t0 = Date.now();
      try {
        const data = await apiRequest(probe.url);
        const val = probe.key ? data?.[probe.key] : data;
        next[probe.id] = { ok: true, latency: Date.now() - t0, info: probe.key ? val?.status ?? 'ok' : data?.status ?? 'ok' };
      } catch {
        next[probe.id] = { ok: false, latency: Date.now() - t0, info: 'unreachable' };
      }
    }
    setResults(next);
    setRunning(false);
  }

  useEffect(() => { if (active && !results) run(); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return { results, running, run };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ArticleCard({ article, open, onToggle }) {
  return (
    <article
      className={`helpdesk-k-article${open ? ' helpdesk-k-article--open' : ''}`}
      aria-label={article.title}
    >
      <button
        className="helpdesk-k-article__toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="helpdesk-k-article__meta">
          <span className="helpdesk-k-article__section">{article.section}</span>
          <strong className="helpdesk-k-article__title">{article.title}</strong>
        </span>
        <span className="helpdesk-k-article__chevron" aria-hidden="true">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open && (
        <div className="helpdesk-k-article__body" role="region">
          <p>{article.body}</p>
        </div>
      )}
    </article>
  );
}

function DiagnosticsPanel() {
  const [active, setActive] = useState(false);
  const { results, running, run } = useDiagnostics(active);

  return (
    <section className="helpdesk-k-diag">
      <div className="helpdesk-k-diag__header">
        <span className="helpdesk-k-diag__icon"><FlaskConical size={15} /></span>
        <div>
          <h2 className="helpdesk-k-diag__title">Workspace diagnostics</h2>
          <p className="helpdesk-k-diag__sub">Probes the live API and database connection.</p>
        </div>
        <div className="helpdesk-k-diag__actions">
          {!active ? (
            <button
              className="helpdesk-k-btn helpdesk-k-btn--primary"
              onClick={() => setActive(true)}
            >
              <Zap size={14} /> Run diagnostics
            </button>
          ) : (
            <button
              className="helpdesk-k-btn helpdesk-k-btn--secondary"
              onClick={run}
              disabled={running}
              aria-label="Re-run diagnostics"
            >
              <RefreshCw size={14} className={running ? 'helpdesk-k-spin' : ''} />
              {running ? 'Running…' : 'Re-run'}
            </button>
          )}
        </div>
      </div>

      {active && (
        <div className="helpdesk-k-diag__probes">
          {DIAG_PROBES.map(probe => {
            const r = results?.[probe.id];
            return (
              <div key={probe.id} className={`helpdesk-k-probe${r ? (r.ok ? ' helpdesk-k-probe--ok' : ' helpdesk-k-probe--fail') : ''}`}>
                <span className="helpdesk-k-probe__icon">{probe.icon}</span>
                <span className="helpdesk-k-probe__label">{probe.label}</span>
                {running && !r && <span className="helpdesk-k-probe__status helpdesk-k-probe__status--loading">checking…</span>}
                {r && (
                  <>
                    <span className={`helpdesk-k-probe__status${r.ok ? ' ok' : ' fail'}`}>
                      {r.ok ? <CheckCircle2 size={13} /> : <X size={13} />}
                      {r.ok ? r.info : 'offline'}
                    </span>
                    <span className="helpdesk-k-probe__latency">{r.latency}ms</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SectionNav({ sections, activeSectionId, onSelect }) {
  return (
    <nav className="helpdesk-k-section-nav" aria-label="Help sections">
      {sections.map(s => (
        <button
          key={s.id}
          className={`helpdesk-k-section-btn${activeSectionId === s.id ? ' helpdesk-k-section-btn--active' : ''}`}
          onClick={() => onSelect(s.id)}
          style={{ '--section-accent': s.color }}
        >
          <span className="helpdesk-k-section-btn__dot" aria-hidden="true" />
          <span className="helpdesk-k-section-btn__icon">{s.icon}</span>
          <span>{s.label}</span>
          <span className="helpdesk-k-section-btn__count">{s.articles.length}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Helpdesk() {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ALL_ARTICLES.filter(a => {
      const matchesQ = !q || `${a.title} ${a.body} ${a.section}`.toLowerCase().includes(q);
      const matchesS = !activeSection || a.sectionId === activeSection;
      return matchesQ && matchesS;
    });
  }, [query, activeSection]);

  function toggleOpen(id) {
    setOpenId(prev => (prev === id ? null : id));
  }

  const totalArticles = ALL_ARTICLES.length;
  const resultLabel = query || activeSection
    ? `${filtered.length} / ${totalArticles}`
    : `${totalArticles}`;

  return (
    <div className="helpdesk-k">
      <style>{HELPDESK_CSS}</style>

      {/* ── Page header ── */}
      <PageHeader
        accent="Helpdesk & Docs"
        icon={<LifeBuoy size={18} />}
        title="Understand your workspace"
        subtitle="Practical answers for data, Pinto Kinetic UI, integrations, logs, and all four GrowthTrack workspaces."
      />

      {/* ── Hero search bar ── */}
      <div className="helpdesk-k-hero">
        <div className="helpdesk-k-search-wrap">
          <Search className="helpdesk-k-search-icon" size={18} aria-hidden="true" />
          <input
            className="helpdesk-k-search"
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveSection(null); setOpenId(null); }}
            placeholder="Search all help articles…"
            aria-label="Search help articles"
          />
          {query && (
            <button
              className="helpdesk-k-search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="helpdesk-k-hero-meta">
          <span className="helpdesk-k-result-badge">{resultLabel} articles</span>
          {(query || activeSection) && (
            <button
              className="helpdesk-k-btn helpdesk-k-btn--ghost"
              onClick={() => { setQuery(''); setActiveSection(null); setOpenId(null); }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Body layout ── */}
      <div className="helpdesk-k-layout">

        {/* Left rail ── section nav + quick links */}
        <aside className="helpdesk-k-aside">
          <div className="helpdesk-k-aside-block">
            <p className="helpdesk-k-aside-label">
              <Lightbulb size={13} /> Browse by topic
            </p>
            <SectionNav
              sections={SECTIONS}
              activeSectionId={activeSection}
              onSelect={id => {
                setActiveSection(prev => (prev === id ? null : id));
                setQuery('');
                setOpenId(null);
              }}
            />
          </div>

          <div className="helpdesk-k-aside-block">
            <p className="helpdesk-k-aside-label">
              <ArrowRight size={13} /> Quick access
            </p>
            <nav className="helpdesk-k-quick-links" aria-label="Quick links">
              {QUICK_LINKS.map(link => (
                <a key={link.href} href={link.href} className="helpdesk-k-quick-link">
                  <span className="helpdesk-k-quick-link__icon">{link.icon}</span>
                  {link.label}
                  <ChevronRight size={13} className="helpdesk-k-quick-link__arrow" aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>

          <div className="helpdesk-k-tip-block">
            <span className="helpdesk-k-tip-icon"><HelpCircle size={16} /></span>
            <h3>Start with three signals</h3>
            <p>Set one physique target, one weekly goal, and one calendar commitment. Analytics can then forecast progress from real activity instead of empty assumptions.</p>
          </div>
        </aside>

        {/* Main article list */}
        <main className="helpdesk-k-main">
          {filtered.length > 0 ? (
            <div className="helpdesk-k-articles" role="list">
              {filtered.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  open={openId === article.id}
                  onToggle={() => toggleOpen(article.id)}
                />
              ))}
            </div>
          ) : (
            <div className="helpdesk-k-empty">
              <BookOpen size={32} aria-hidden="true" />
              <h2>No articles match</h2>
              <p>Try a different keyword or clear the active filter to browse all docs.</p>
              <button
                className="helpdesk-k-btn helpdesk-k-btn--primary"
                onClick={() => { setQuery(''); setActiveSection(null); }}
              >
                Browse all docs
              </button>
            </div>
          )}

          {/* Diagnostics panel */}
          <DiagnosticsPanel />
        </main>
      </div>
    </div>
  );
}

// ── Scoped CSS (Pinto Kinetic) ────────────────────────────────────────────────

const HELPDESK_CSS = `
/* Helpdesk — Pinto Kinetic v5 */
.helpdesk-k {
  --hk-border: var(--gt-border-strong);
  --hk-shadow: 3px 3px 0 color-mix(in srgb, var(--gt-text) 18%, transparent);
  --hk-radius: 20px;
  --hk-radius-sm: 12px;
  --hk-pill: 999px;
  display: grid;
  gap: 28px;
  min-inline-size: 0;
  padding-block-end: 64px;
}

/* Hero search */
.helpdesk-k-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}
.helpdesk-k-search-wrap {
  position: relative;
  flex: 1 1 320px;
  display: flex;
  align-items: center;
  border: 1.5px solid var(--hk-border);
  border-radius: var(--hk-radius-sm);
  background: var(--gt-surface);
  box-shadow: var(--hk-shadow);
  transition: box-shadow 160ms, border-color 160ms;
}
.helpdesk-k-search-wrap:focus-within {
  border-color: var(--gt-action);
  box-shadow: 3px 3px 0 var(--gt-action);
}
.helpdesk-k-search-icon {
  flex: none;
  margin-inline-start: 14px;
  color: var(--gt-muted);
}
.helpdesk-k-search {
  flex: 1;
  min-inline-size: 0;
  padding: 12px 14px;
  border: 0;
  background: transparent;
  color: var(--gt-text);
  font: 500 15px/1.4 var(--gt-font);
}
.helpdesk-k-search:focus { outline: none; }
.helpdesk-k-search::-webkit-search-cancel-button { display: none; }
.helpdesk-k-search-clear {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 36px;
  block-size: 36px;
  margin-inline-end: 4px;
  border: 0;
  border-radius: var(--hk-radius-sm);
  background: transparent;
  color: var(--gt-muted);
  cursor: pointer;
}
.helpdesk-k-search-clear:hover { color: var(--gt-text); background: var(--gt-surface-raised); }
.helpdesk-k-hero-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.helpdesk-k-result-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border: 1.5px solid var(--hk-border);
  border-radius: var(--hk-pill);
  background: var(--gt-surface);
  color: var(--gt-muted);
  font: 600 12px/1.3 var(--gt-font);
  letter-spacing: .03em;
  box-shadow: 2px 2px 0 color-mix(in srgb, var(--gt-text) 12%, transparent);
}

/* Layout */
.helpdesk-k-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: start;
  gap: 24px;
}
@media (max-width: 860px) {
  .helpdesk-k-layout { grid-template-columns: 1fr; }
}

/* Aside */
.helpdesk-k-aside {
  display: grid;
  gap: 16px;
  position: sticky;
  top: 24px;
}
.helpdesk-k-aside-block {
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1.5px solid var(--hk-border);
  border-radius: var(--hk-radius);
  background: var(--gt-surface);
  box-shadow: var(--hk-shadow);
}
.helpdesk-k-aside-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  color: var(--gt-muted);
  font: 700 10px/1.3 var(--gt-font);
  letter-spacing: .12em;
  text-transform: uppercase;
}

/* Section nav */
.helpdesk-k-section-nav {
  display: grid;
  gap: 4px;
}
.helpdesk-k-section-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  min-block-size: 40px;
  padding: 0 10px;
  border: 1.5px solid transparent;
  border-radius: var(--hk-radius-sm);
  background: transparent;
  color: var(--gt-text);
  font: 500 13px/1.3 var(--gt-font);
  cursor: pointer;
  text-align: start;
  transition: background 140ms, border-color 140ms;
}
.helpdesk-k-section-btn:hover {
  background: var(--gt-surface-raised);
  border-color: var(--hk-border);
}
.helpdesk-k-section-btn--active {
  background: color-mix(in srgb, var(--section-accent, var(--gt-action)) 14%, var(--gt-surface));
  border-color: var(--section-accent, var(--gt-action));
  font-weight: 650;
}
.helpdesk-k-section-btn__dot {
  display: none;
}
.helpdesk-k-section-btn__icon {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 26px;
  block-size: 26px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--section-accent, var(--gt-action)) 18%, var(--gt-surface-raised));
  color: var(--gt-text);
}
.helpdesk-k-section-btn__count {
  margin-inline-start: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 20px;
  block-size: 20px;
  padding: 0 5px;
  border-radius: 6px;
  background: var(--gt-surface-raised);
  border: 1px solid var(--hk-border);
  color: var(--gt-muted);
  font: 600 10px/1 var(--gt-font);
}

/* Quick links */
.helpdesk-k-quick-links {
  display: grid;
  gap: 2px;
}
.helpdesk-k-quick-link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-block-size: 40px;
  padding: 0 10px;
  border-radius: var(--hk-radius-sm);
  color: var(--gt-text);
  font: 500 13px/1.3 var(--gt-font);
  text-decoration: none;
  transition: background 120ms;
}
.helpdesk-k-quick-link:hover { background: var(--gt-surface-raised); }
.helpdesk-k-quick-link__icon {
  display: grid;
  place-items: center;
  flex: none;
  color: var(--gt-action);
}
.helpdesk-k-quick-link__arrow {
  margin-inline-start: auto;
  color: var(--gt-muted);
  transition: transform 160ms;
}
.helpdesk-k-quick-link:hover .helpdesk-k-quick-link__arrow { transform: translateX(3px); }

/* Tip block */
.helpdesk-k-tip-block {
  padding: 16px;
  border: 1.5px solid var(--gt-character-mint);
  border-radius: var(--hk-radius);
  background: color-mix(in srgb, var(--gt-character-mint) 10%, var(--gt-surface));
  box-shadow: 3px 3px 0 var(--gt-character-mint);
}
.helpdesk-k-tip-icon {
  display: inline-flex;
  align-items: center;
  color: var(--gt-text);
  margin-block-end: 8px;
}
.helpdesk-k-tip-block h3 {
  margin: 0 0 8px;
  font: 700 14px/1.35 var(--gt-font);
  letter-spacing: -.025em;
  color: var(--gt-text);
}
.helpdesk-k-tip-block p {
  margin: 0;
  font: 400 12px/1.65 var(--gt-font);
  color: var(--gt-muted);
}

/* Main article list */
.helpdesk-k-main {
  display: grid;
  gap: 20px;
  min-inline-size: 0;
}
.helpdesk-k-articles {
  display: grid;
  gap: 0;
  border: 1.5px solid var(--hk-border);
  border-radius: var(--hk-radius);
  background: var(--gt-surface);
  box-shadow: var(--hk-shadow);
  overflow: hidden;
}

/* Article card */
.helpdesk-k-article {
  border-block-end: 1px solid var(--gt-border);
}
.helpdesk-k-article:last-child { border-block-end: 0; }
.helpdesk-k-article__toggle {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-block-size: 68px;
  padding: 16px 20px;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: start;
  transition: background 120ms;
}
.helpdesk-k-article__toggle:hover { background: var(--gt-surface-raised); }
.helpdesk-k-article--open .helpdesk-k-article__toggle {
  background: color-mix(in srgb, var(--gt-action) 6%, var(--gt-surface));
  border-block-end: 1px solid var(--gt-border);
}
.helpdesk-k-article__meta {
  display: grid;
  gap: 2px;
  flex: 1;
  min-inline-size: 0;
}
.helpdesk-k-article__section {
  font: 600 10px/1.3 var(--gt-font);
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--gt-action);
}
.helpdesk-k-article__title {
  font: 650 14px/1.4 var(--gt-font);
  letter-spacing: -.02em;
  color: var(--gt-text);
}
.helpdesk-k-article__chevron {
  flex: none;
  display: grid;
  place-items: center;
  inline-size: 32px;
  block-size: 32px;
  border: 1.5px solid var(--hk-border);
  border-radius: 8px;
  background: var(--gt-surface-raised);
  color: var(--gt-muted);
  box-shadow: 2px 2px 0 color-mix(in srgb, var(--gt-text) 10%, transparent);
  transition: transform 180ms cubic-bezier(.22,1,.36,1);
}
.helpdesk-k-article--open .helpdesk-k-article__chevron { transform: none; }
.helpdesk-k-article__body {
  padding: 16px 20px 20px;
  animation: helpdesk-expand 200ms cubic-bezier(.22,1,.36,1);
}
.helpdesk-k-article__body p {
  margin: 0;
  font: 400 14px/1.75 var(--gt-font);
  color: var(--gt-muted);
}
@keyframes helpdesk-expand {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Empty state */
.helpdesk-k-empty {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 12px;
  padding: 56px 24px;
  border: 1.5px dashed var(--hk-border);
  border-radius: var(--hk-radius);
  color: var(--gt-muted);
}
.helpdesk-k-empty h2 { margin: 0; font: 700 18px/1.3 var(--gt-font); color: var(--gt-text); letter-spacing: -.03em; }
.helpdesk-k-empty p  { margin: 0; max-inline-size: 42ch; font-size: 14px; line-height: 1.65; }

/* Diagnostics panel */
.helpdesk-k-diag {
  padding: 20px;
  border: 1.5px solid var(--hk-border);
  border-radius: var(--hk-radius);
  background: var(--gt-surface);
  box-shadow: var(--hk-shadow);
}
.helpdesk-k-diag__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.helpdesk-k-diag__icon {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 36px;
  block-size: 36px;
  border: 1.5px solid var(--hk-border);
  border-radius: 10px;
  background: var(--gt-surface-raised);
  box-shadow: 2px 2px 0 color-mix(in srgb, var(--gt-text) 12%, transparent);
  color: var(--gt-text);
}
.helpdesk-k-diag__title {
  margin: 0;
  font: 700 15px/1.35 var(--gt-font);
  letter-spacing: -.03em;
  color: var(--gt-text);
}
.helpdesk-k-diag__sub {
  margin: 3px 0 0;
  font: 400 12px/1.5 var(--gt-font);
  color: var(--gt-muted);
}
.helpdesk-k-diag__actions { margin-inline-start: auto; }
.helpdesk-k-diag__probes {
  display: grid;
  gap: 8px;
  margin-block-start: 16px;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--gt-border);
}
.helpdesk-k-probe {
  display: flex;
  align-items: center;
  gap: 10px;
  min-block-size: 44px;
  padding: 10px 14px;
  border: 1.5px solid var(--hk-border);
  border-radius: var(--hk-radius-sm);
  background: var(--gt-surface-raised);
  font: 500 13px/1.3 var(--gt-font);
  color: var(--gt-text);
}
.helpdesk-k-probe--ok  { border-color: var(--gt-success); }
.helpdesk-k-probe--fail { border-color: var(--gt-danger); }
.helpdesk-k-probe__icon { color: var(--gt-muted); display: grid; place-items: center; }
.helpdesk-k-probe__label { font-weight: 650; }
.helpdesk-k-probe__status {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-inline-start: auto;
  font: 600 12px/1 var(--gt-font);
  color: var(--gt-muted);
}
.helpdesk-k-probe__status.ok   { color: var(--gt-success); }
.helpdesk-k-probe__status.fail { color: var(--gt-danger); }
.helpdesk-k-probe__status--loading { color: var(--gt-muted); font-style: italic; }
.helpdesk-k-probe__latency {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--hk-border);
  border-radius: var(--hk-pill);
  background: var(--gt-surface);
  font: 600 10px/1.4 var(--gt-font);
  color: var(--gt-muted);
  font-variant-numeric: tabular-nums;
}

/* Buttons */
.helpdesk-k-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-block-size: 40px;
  padding: 0 16px;
  border-radius: var(--hk-pill);
  font: 650 13px/1.3 var(--gt-font);
  cursor: pointer;
  transition: transform 160ms cubic-bezier(.22,1,.36,1);
}
.helpdesk-k-btn:hover:not(:disabled) { transform: translateY(-2px); }
.helpdesk-k-btn:active:not(:disabled) { transform: translateY(1px) scale(.98); transition-duration: 100ms; }
.helpdesk-k-btn:disabled { opacity: .5; cursor: default; }
.helpdesk-k-btn--primary {
  border: 1.5px solid color-mix(in srgb, var(--gt-on-action) 60%, var(--gt-action));
  background: var(--gt-action);
  color: var(--gt-on-action);
  box-shadow: 3px 3px 0 color-mix(in srgb, var(--gt-text) 18%, transparent);
}
.helpdesk-k-btn--secondary {
  border: 1.5px solid var(--hk-border);
  background: var(--gt-surface);
  color: var(--gt-text);
  box-shadow: 2px 2px 0 color-mix(in srgb, var(--gt-text) 12%, transparent);
}
.helpdesk-k-btn--ghost {
  border: 1.5px solid transparent;
  background: transparent;
  color: var(--gt-action);
}
.helpdesk-k-btn--ghost:hover { background: color-mix(in srgb, var(--gt-action) 8%, transparent); border-color: transparent; transform: none; }

/* Spinner */
.helpdesk-k-spin { animation: helpdesk-spin 800ms linear infinite; }
@keyframes helpdesk-spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .helpdesk-k-aside { position: static; }
  .helpdesk-k-article__toggle { padding: 14px 16px; }
  .helpdesk-k-article__body { padding: 12px 16px 16px; }
}
`;
