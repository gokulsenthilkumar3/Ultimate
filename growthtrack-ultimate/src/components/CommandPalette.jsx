import { Z_INDEX } from '../constants';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, ArrowRight, Target, CheckSquare, FileText, Flame, Star,
  Layout, Zap, X, Sparkles,
} from 'lucide-react';
import useStore, { selectSetActiveTab } from '../store/useStore';
import { TABS } from '../config/navigation';
import useDialogFocus from '../hooks/useDialogFocus';
import { queuePendingUiAction } from '../lib/pendingUiAction';
import { parseQuickCapture, QUICK_CAPTURE_EXAMPLES } from '../lib/quickCapture';
import { apiRequest } from '../lib/apiClient';
import { useToast } from '../hooks/useToast';
import { useKinetic } from './motion/KineticContext';
import './CommandPalette.css';

// ── Module icon map ───────────────────────────────────────────────────────────
const MODULE_ICONS = {
  overview: '🏠', humanoid: '🫀', physique: '📐', assessment: '📋',
  training: '💪', nutrition: '🥗', sleep: '😴', lifestyle: '🌿',
  progress: '📈', goals: '🎯', skills: '⚡', health: '🩺',
  habits: '🔥', shopping: '🛒', tasks: '✅', projects: '🛠',
  portfolio: '💹', calendar: '📅', timesheet: '⏱', finance: '💰',
  entertainment: '🎬', social: '🌐', ai: '🤖', maps: '🗺',
  documents: '📄', current: '🌤', notes: '📝', databases: '🗃',
  logs: '📊', settings: '⚙️', dashboards: '📉', mind: '🧠',
  medical: '🏥', hydration: '💧', strength: '🏋', analytics: '📊',
  apps: '🚀', about: 'ℹ️', sip: '💰', forecast: '🔮',
  notifications: '🔔',
};

// ── Fuzzy scorer: returns 0-1 relevance score ─────────────────────────────────
function fuzzyScore(str, query) {
  if (!query) return 0.5;
  const s = String(str ?? '').toLowerCase();
  const q = query.toLowerCase();
  if (s === q) return 1;
  if (s.startsWith(q)) return 0.9;
  if (s.includes(q)) return 0.7;
  // character-sequence match
  let qi = 0;
  for (let si = 0; si < s.length && qi < q.length; si++) {
    if (s[si] === q[qi]) qi++;
  }
  if (qi === q.length) return 0.4 + (0.2 * qi / q.length);
  return 0;
}

// ── Highlight query chars in a string → React spans ──────────────────────────
function Highlight({ text = '', query = '' }) {
  if (!query.trim()) return <span>{text}</span>;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(99,102,241,0.35)', color: 'var(--accent)', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

// ── Result groups ─────────────────────────────────────────────────────────────
const GROUP_LABELS = {
  module:  { label: 'Navigate',  icon: <Layout    size={11} /> },
  task:    { label: 'Tasks',     icon: <CheckSquare size={11} /> },
  goal:    { label: 'Goals',     icon: <Target    size={11} /> },
  note:    { label: 'Notes',     icon: <FileText  size={11} /> },
  habit:   { label: 'Habits',   icon: <Flame     size={11} /> },
  skill:   { label: 'Skills',   icon: <Star      size={11} /> },
  action:  { label: 'Actions',  icon: <Zap       size={11} /> },
  capture: { label: 'Quick capture', icon: <Sparkles size={11} /> },
};

const CAPTURE_ICONS = { expense: '💸', income: '💰', hydration: '💧', sleep: '😴', weight: '⚖️', mood: '🧠', task: '✅' };

const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_TASKS = Object.freeze({});

const QUICK_ACTIONS = [
  { id: 'qa-task',    type: 'action', label: 'Add new task',  icon: '✅', tab: 'tasks',    detail: 'Open the task form', openForm: true },
  { id: 'qa-habit',   type: 'action', label: 'Add a habit',   icon: '🔥', tab: 'habits',   detail: 'Open the habit form', openForm: true },
  { id: 'qa-note',    type: 'action', label: 'Open notes',     icon: '📝', tab: 'notes',    detail: 'Browse and edit notes' },
  { id: 'qa-finance', type: 'action', label: 'Open finance',   icon: '💰', tab: 'finance',  detail: 'Review transactions and budgets' },
  { id: 'qa-workout', type: 'action', label: 'Open training',  icon: '💪', tab: 'training', detail: 'Review the workout planner' },
  { id: 'qa-ai',      type: 'action', label: 'Open Agent',     icon: '🤖', tab: 'ai',       detail: 'Ask the local assistant' },
  { id: 'qa-cal',     type: 'action', label: 'Open calendar',  icon: '📅', tab: 'calendar', detail: 'Review your schedule' },
  { id: 'qa-sleep',   type: 'action', label: 'Open sleep log', icon: '😴', tab: 'sleep',    detail: 'Review sleep history' },
];

function KineticResultIcon({ item }) {
  // Reuse the navigation SVGs instead of loading a colour emoji font on first open.
  const Icon = TABS[item.tab]?.icon || ({ task: CheckSquare, goal: Target, note: FileText, habit: Flame, skill: Star, capture: Sparkles })[item.type] || Layout;
  return <Icon size={18} aria-hidden="true" />;
}

export default function CommandPalette() {
  const { enabled: kineticEnabled } = useKinetic();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery]   = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const dialogRef = useDialogFocus(isOpen, () => setIsOpen(false));

  const setActiveTab = useStore(selectSetActiveTab);
  const activeTab = useStore(s => s.activeTab);
  const toast = useToast();
  const [capturing, setCapturing] = useState(false);
  const sleepLogs = useStore(s => s.sleep_logs ?? EMPTY_ARRAY);
  const moodLogs = useStore(s => s.moodLogs ?? EMPTY_ARRAY);

  // Data sources for cross-entity search
  const tasks  = useStore(s => s.user?.tasks ?? EMPTY_TASKS);
  const goals  = useStore(s => s.goals ?? EMPTY_ARRAY);
  const notes  = useStore(s => s.notes ?? EMPTY_ARRAY);
  const habits = useStore(s => s.habits ?? EMPTY_ARRAY);
  const skills = useStore(s => s.skills ?? EMPTY_ARRAY);

  // ── Open / close ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
        } else {
          setQuery('');
          setSelectedIdx(0);
          setIsOpen(true);
        }
      }
    };
    const openPalette = () => {
      setQuery('');
      setSelectedIdx(0);
      setIsOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', openPalette);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', openPalette);
    };
  }, [isOpen]);

  // ── Build result list ─────────────────────────────────────────────────────
  const results = useMemo(() => {
    // The palette stays mounted in the shell; closed searches need no ranking work.
    if (!isOpen) return EMPTY_ARRAY;
    const q = query.trim();
    const candidates = [];

    // A sentence such as "spent 450 on lunch" becomes one reviewed record.
    const capture = parseQuickCapture(q);
    if (capture) {
      const existing = capture.target === 'sleep' ? sleepLogs : capture.target === 'mood' ? moodLogs : null;
      const replaces = existing?.some(row => row?.date === capture.payload.date);
      candidates.push({ type: 'capture', id: 'quick-capture', label: capture.title, icon: CAPTURE_ICONS[capture.kind] || '✨', score: 2,
        detail: `${capture.detail}${replaces ? ' · replaces the entry for that day' : ''} · Enter to save`, capture });
    }

    // Modules
    Object.entries(TABS).forEach(([id, meta]) => {
      const searchText = `${id} ${meta.label} ${(meta.keywords || []).join(' ')}`;
      const score = Math.max(fuzzyScore(meta.label, q), fuzzyScore(searchText, q));
      if (!q || score > 0) candidates.push({ type: 'module', id, label: meta.label, icon: meta.emoji || MODULE_ICONS[id] || '📌', score, detail: 'Go to module', tab: id });
    });

    // Tasks (pending only)
    const pendingTasks = Array.isArray(tasks)
      ? tasks.filter(t => t.status !== 'done' && t.title)
      : (tasks?.pending || []);
    if (Array.isArray(pendingTasks)) {
      pendingTasks.slice(0, 50).forEach(t => {
        const score = Math.max(fuzzyScore(t.title || '', q), fuzzyScore(t.category || '', q));
        if (!q || score > 0) candidates.push({ type: 'task', id: `task-${t.id}`, label: t.title, icon: '✅', score, detail: `${t.priority || 'task'} · ${t.category || ''}`, tab: 'tasks' });
      });
    }

    // Goals
    const goalsList = Array.isArray(goals) ? goals : [];
    goalsList.slice(0, 30).forEach(g => {
      const score = Math.max(fuzzyScore(g.title || '', q), fuzzyScore(g.category || '', q));
      if (!q || score > 0) candidates.push({ type: 'goal', id: `goal-${g.id}`, label: g.title, icon: '🎯', score, detail: `${g.status || 'goal'} · ${g.category || ''}`, tab: 'goals' });
    });

    // Notes
    const notesList = Array.isArray(notes) ? notes : [];
    notesList.slice(0, 30).forEach(n => {
      const tags = Array.isArray(n.tags) ? n.tags : [];
      const score = Math.max(fuzzyScore(n.title || '', q), fuzzyScore(tags.join(' '), q), fuzzyScore(typeof n.content === 'string' ? n.content.slice(0, 100) : '', q));
      if (!q || score > 0) candidates.push({ type: 'note', id: `note-${n.id}`, label: n.title || 'Untitled note', icon: '📝', score, detail: tags.join(', ') || 'note', tab: 'notes' });
    });

    // Habits
    const habitsList = Array.isArray(habits) ? habits : [];
    habitsList.slice(0, 30).forEach(h => {
      const score = Math.max(fuzzyScore(h.name || '', q), fuzzyScore(h.category || '', q));
      if (!q || score > 0) candidates.push({ type: 'habit', id: `habit-${h.id}`, label: h.name, icon: h.emoji || '🔥', score, detail: h.category || 'habit', tab: 'habits' });
    });

    // Skills
    const skillsList = Array.isArray(skills) ? skills : [];
    skillsList.slice(0, 30).forEach(sk => {
      const score = Math.max(fuzzyScore(sk.name || '', q), fuzzyScore(sk.category || '', q));
      if (!q || score > 0) candidates.push({ type: 'skill', id: `skill-${sk.id}`, label: sk.name, icon: '⚡', score, detail: `Lv ${sk.level || 1} · ${sk.category || 'skill'}`, tab: 'skills' });
    });

    // Quick actions (shown when query is empty or matches)
    QUICK_ACTIONS.forEach(a => {
      const score = Math.max(fuzzyScore(a.label, q), fuzzyScore(a.detail, q));
      if (!q || score > 0) candidates.push({ ...a, score });
    });

    // Sort: by score desc, then by type priority
    const typePriority = { capture: -1, module: 0, action: 1, task: 2, goal: 3, note: 4, habit: 5, skill: 6 };
    return candidates
      .filter(c => !q || c.score > 0)
      .sort((a, b) => {
        if (Math.abs(b.score - a.score) > 0.05) return b.score - a.score;
        return (typePriority[a.type] ?? 9) - (typePriority[b.type] ?? 9);
      })
      .slice(0, 40);
  }, [isOpen, query, tasks, goals, notes, habits, skills, sleepLogs, moodLogs]);

  // Store updates can remove results while the input remains focused.
  const activeIdx = Math.min(selectedIdx, Math.max(0, results.length - 1));

  // Group consecutive items of the same type
  const grouped = useMemo(() => {
    const groups = [];
    let lastType = null;
    results.forEach((item, idx) => {
      if (item.type !== lastType) {
        groups.push({ type: item.type, items: [{ item, idx }] });
        lastType = item.type;
      } else {
        groups[groups.length - 1].items.push({ item, idx });
      }
    });
    return groups;
  }, [results]);

  useEffect(() => {
    if (isOpen) document.getElementById(`command-result-${activeIdx}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIdx, isOpen, results]);

  const saveCapture = useCallback(async (capture) => {
    if (capturing) return;
    const state = useStore.getState();
    const writers = {
      transaction: payload => state.addTransaction(payload),
      task: payload => state.addTask(payload),
      metric: payload => state.addMetricLog(payload),
      mood: payload => state.addMoodLog(payload),
      sleep: payload => state.saveSleepLog(payload),
      hydration: payload => apiRequest('/api/hydration/log', { method: 'POST', body: JSON.stringify(payload) }),
    };
    setCapturing(true);
    try {
      await writers[capture.target](capture.payload);
      toast.success(`Saved · ${capture.title.replace(/^[^·]*·\s*/, '')}`);
      setQuery('');
      setIsOpen(false);
    } catch (error) {
      toast.error(error?.message || 'This entry could not be saved. Nothing was changed.');
    } finally { setCapturing(false); }
  }, [capturing, toast]);

  const handleSelect = useCallback((item) => {
    if (item.type === 'capture') {
      if (item.capture) saveCapture(item.capture);
      return;
    }
    if (item.type === 'action' && item.openForm) {
      if (activeTab === item.tab) {
        window.requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('open-add-form', { detail: item.tab }));
        });
      } else {
        queuePendingUiAction(item.tab);
      }
    }
    setActiveTab(item.tab || item.id);
    setIsOpen(false);
  }, [activeTab, setActiveTab, saveCapture]);

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(Math.max(0, Math.min(activeIdx + 1, results.length - 1))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(Math.max(activeIdx - 1, 0)); }
    else if (e.key === 'Enter' && results[activeIdx]) { e.preventDefault(); handleSelect(results[activeIdx]); }
  };

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-backdrop"
      style={{
        zIndex: Z_INDEX.PALETTE || 9999,
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search your workspace"
        className="glass-card fade-in command-palette-dialog"
        style={{ padding: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="command-palette-search">
          <Search size={18} color="var(--text-3)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            data-dialog-autofocus
            aria-label="Search your workspace or capture an entry"
            aria-busy={capturing}
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="command-results"
            aria-activedescendant={results[activeIdx] ? `command-result-${activeIdx}` : undefined}
            type="text"
            placeholder="Search, or capture: “spent 450 on lunch”, “drank 500ml”…"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <button className="header-control" onClick={() => setIsOpen(false)} aria-label="Close search"><X size={18} /></button>
        </div>

        {/* Results */}
        <div id="command-results" role="listbox" aria-label="Search results">
          {results.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
              No results for <strong style={{ color: 'var(--text-2)' }}>"{query}"</strong>
            </div>
          ) : (
            grouped.map((group, gi) => (
              <div key={`grp-${gi}`}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px 4px', color: 'var(--text-3)', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {GROUP_LABELS[group.type]?.icon}
                  {GROUP_LABELS[group.type]?.label || group.type}
                </div>

                {group.items.map(({ item, idx }) => (
                  <button
                    key={item.id}
                    id={`command-result-${idx}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={idx === activeIdx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '9px 12px', borderRadius: '8px', border: 'none',
                      background: idx === activeIdx ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: 'var(--text-1)', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', fontSize: '1rem', flexShrink: 0, width: '22px', textAlign: 'center' }}>{kineticEnabled ? <KineticResultIcon item={item} /> : item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: idx === activeIdx ? 700 : 600, color: idx === activeIdx ? 'var(--accent)' : 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Highlight text={item.label} query={query} />
                      </div>
                      {item.detail && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Highlight text={item.detail} query={query} />
                        </div>
                      )}
                    </div>
                    {idx === activeIdx && <ArrowRight size={13} color="var(--accent)" style={{ flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="command-palette-footer">
          <span>↑↓ navigate</span>
          <span>↵ {results[activeIdx]?.type === 'capture' ? (capturing ? 'saving…' : 'save') : 'open'}</span>
          <span>Esc close</span>
          {!query.trim() && <span className="command-palette-example" title={QUICK_CAPTURE_EXAMPLES.join(' · ')}>{!kineticEnabled && '✨ '}Try “{QUICK_CAPTURE_EXAMPLES[activeIdx % QUICK_CAPTURE_EXAMPLES.length]}”</span>}
          <span role="status" aria-live="polite" aria-atomic="true">{results.length ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'No results'}</span>
        </div>
      </div>
    </div>
  );
}
