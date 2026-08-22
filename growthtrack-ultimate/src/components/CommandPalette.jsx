import { Z_INDEX } from '../constants';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, ArrowRight, Target, CheckSquare, FileText, Flame, Star,
  BarChart2, Layout, Zap, Clock, Hash,
} from 'lucide-react';
import useStore, { selectSetActiveTab } from '../store/useStore';
import { GLOBAL_MODULES } from '../constants/modules';

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
  const s = str.toLowerCase();
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
};

const QUICK_ACTIONS = [
  { id: 'qa-task',    type: 'action', label: 'Add new task',       icon: '✅', tab: 'tasks',     detail: 'Opens task form' },
  { id: 'qa-note',    type: 'action', label: 'New note',           icon: '📝', tab: 'notes',     detail: 'Opens note editor' },
  { id: 'qa-habit',   type: 'action', label: 'Log a habit',        icon: '🔥', tab: 'habits',    detail: 'Open habit matrix' },
  { id: 'qa-finance', type: 'action', label: 'Log transaction',    icon: '💰', tab: 'finance',   detail: 'Opens finance' },
  { id: 'qa-workout', type: 'action', label: 'Start workout',      icon: '💪', tab: 'training',  detail: 'Opens training' },
  { id: 'qa-ai',      type: 'action', label: 'Ask the AI',         icon: '🤖', tab: 'ai',        detail: 'Opens AI assistant' },
  { id: 'qa-cal',     type: 'action', label: 'Add calendar event', icon: '📅', tab: 'calendar',  detail: 'Opens calendar' },
  { id: 'qa-sleep',   type: 'action', label: 'Log sleep',          icon: '😴', tab: 'sleep',     detail: 'Opens sleep log' },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery]   = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  const setActiveTab = useStore(selectSetActiveTab);

  // Data sources for cross-entity search
  const tasks  = useStore(s => s.tasks)  || [];
  const goals  = useStore(s => s.goals)  || [];
  const notes  = useStore(s => s.notes)  || [];
  const habits = useStore(s => s.habits) || [];
  const skills = useStore(s => s.skills) || [];

  // ── Open / close ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Build result list ─────────────────────────────────────────────────────
  const results = useMemo(() => {
    const q = query.trim();
    const candidates = [];

    // Modules
    Object.entries(GLOBAL_MODULES).forEach(([id, label]) => {
      const score = Math.max(fuzzyScore(label, q), fuzzyScore(id, q));
      if (!q || score > 0) candidates.push({ type: 'module', id, label, icon: MODULE_ICONS[id] || '📌', score, detail: 'Go to module', tab: id });
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
      const score = Math.max(fuzzyScore(n.title || '', q), fuzzyScore((n.tags || []).join(' '), q), fuzzyScore(n.content?.slice(0, 100) || '', q));
      if (!q || score > 0) candidates.push({ type: 'note', id: `note-${n.id}`, label: n.title || 'Untitled note', icon: '📝', score, detail: (n.tags || []).join(', ') || 'note', tab: 'notes' });
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
    const typePriority = { module: 0, action: 1, task: 2, goal: 3, note: 4, habit: 5, skill: 6 };
    return candidates
      .filter(c => !q || c.score > 0)
      .sort((a, b) => {
        if (Math.abs(b.score - a.score) > 0.05) return b.score - a.score;
        return (typePriority[a.type] || 9) - (typePriority[b.type] || 9);
      })
      .slice(0, 40);
  }, [query, tasks, goals, notes, habits, skills]);

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

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleSelect = useCallback((item) => {
    setActiveTab(item.tab || item.id);
    setIsOpen(false);
    // Fire custom event to open relevant form
    if (item.type === 'action' || item.type !== 'module') {
      window.dispatchEvent(new CustomEvent('open-add-form', { detail: item.tab }));
    }
  }, [setActiveTab]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[selectedIdx]) handleSelect(results[selectedIdx]);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: Z_INDEX.PALETTE || 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '8vh',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="glass-card fade-in"
        style={{ width: '92%', maxWidth: '580px', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={18} color="var(--text-3)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search modules, tasks, goals, notes, habits…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: '1rem', fontFamily: 'var(--font-body)' }}
          />
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <kbd style={{ padding: '2px 6px', background: 'var(--bg-elevated)', borderRadius: '4px', fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, border: '1px solid var(--border)' }}>⌘K</kbd>
            <kbd style={{ padding: '2px 6px', background: 'var(--bg-elevated)', borderRadius: '4px', fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, border: '1px solid var(--border)' }}>ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '6px' }}>
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
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '9px 12px', borderRadius: '8px', border: 'none',
                      background: idx === selectedIdx ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: 'var(--text-1)', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: '1rem', flexShrink: 0, width: '22px', textAlign: 'center' }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: idx === selectedIdx ? 700 : 600, color: idx === selectedIdx ? 'var(--accent)' : 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Highlight text={item.label} query={query} />
                      </div>
                      {item.detail && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Highlight text={item.detail} query={query} />
                        </div>
                      )}
                    </div>
                    {idx === selectedIdx && <ArrowRight size={13} color="var(--accent)" style={{ flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{ display: 'flex', gap: '1rem', padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: '0.62rem', color: 'var(--text-3)' }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span style={{ marginLeft: 'auto' }}>{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
