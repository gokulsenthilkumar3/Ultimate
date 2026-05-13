import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Bell, BellOff, CheckCheck, Trash2, RefreshCw,
  AlertCircle, Clock, Target, Flame, TrendingDown, Info, X
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { apiSync } from '../store/useStore';
import useStore from '../store/useStore';

// ── Notification type config ────────────────────────────────────────────────
const TYPE_CONFIG = {
  habit_missed:    { icon: Flame,        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Missed Habit'    },
  task_overdue:    { icon: AlertCircle,  color: '#f97316', bg: 'rgba(249,115,22,0.1)',  label: 'Overdue Task'    },
  goal_deadline:   { icon: Target,       color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  label: 'Goal Deadline'   },
  metric_alert:    { icon: TrendingDown, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  label: 'Metric Alert'    },
  general:         { icon: Info,         color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Info'            },
};

const PRIORITY_ORDER = ['habit_missed', 'task_overdue', 'goal_deadline', 'metric_alert', 'general'];

// ── Generate local notifications from store state ────────────────────────────────
function generateLocalNotifications(user) {
  const notifs = [];
  const today  = new Date().toISOString().slice(0, 10);

  // 1️⃣  Missed habits (not logged today)
  const habits = user?.habits || [];
  habits.forEach(h => {
    const lastLog = h.lastLog || h.last_log;
    if (!lastLog || lastLog < today) {
      notifs.push({
        id:      `habit_${h.id}`,
        type:    'habit_missed',
        title:   `Missed: ${h.name}`,
        body:    `You haven't logged "${h.name}" today. Current streak: ${h.streak || 0} day${h.streak !== 1 ? 's' : ''}.`,
        time:    today,
        read:    false,
        link:    'habits',
      });
    }
  });

  // 2️⃣  Overdue tasks
  const pending = user?.tasks?.pending || [];
  pending.forEach(t => {
    const due = t.dueDate || t.due_date;
    if (due && due < today) {
      const daysOver = Math.ceil((new Date(today) - new Date(due)) / 86400000);
      notifs.push({
        id:   `task_${t.id}`,
        type: 'task_overdue',
        title: `Overdue: ${t.title}`,
        body:  `Due ${daysOver === 1 ? 'yesterday' : `${daysOver} days ago`} (${due}). Priority: ${(t.priority||'p3').toUpperCase()}.`,
        time:  due,
        read:  false,
        link:  'tasks',
      });
    }
  });

  // 3️⃣  Goal deadlines within 7 days
  const goals = user?.goals || [];
  goals.forEach(g => {
    if (g.status === 'completed') return;
    const deadline = g.deadline || g.target_date;
    if (!deadline) return;
    const daysLeft = Math.ceil((new Date(deadline) - new Date(today)) / 86400000);
    if (daysLeft <= 7 && daysLeft >= 0) {
      notifs.push({
        id:   `goal_${g.id}`,
        type: 'goal_deadline',
        title: `Goal deadline soon: ${g.title}`,
        body:  daysLeft === 0
          ? `"${g.title}" deadline is today! Progress: ${g.progress || 0}%.`
          : `"${g.title}" is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Progress: ${g.progress || 0}%.`,
        time:  deadline,
        read:  false,
        link:  'goals',
      });
    }
    // overdue goal
    if (daysLeft < 0) {
      notifs.push({
        id:   `goal_over_${g.id}`,
        type: 'goal_deadline',
        title: `Goal overdue: ${g.title}`,
        body:  `Missed deadline by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}. Progress: ${g.progress || 0}%.`,
        time:  deadline,
        read:  false,
        link:  'goals',
      });
    }
  });

  // sort by PRIORITY_ORDER then time desc
  notifs.sort((a, b) => {
    const pa = PRIORITY_ORDER.indexOf(a.type);
    const pb = PRIORITY_ORDER.indexOf(b.type);
    if (pa !== pb) return pa - pb;
    return b.time > a.time ? 1 : -1;
  });

  return notifs;
}

// ── NotifCard ─────────────────────────────────────────────────────────────────────
function NotifCard({ notif, onRead, onDismiss, onNavigate }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
  const Icon = cfg.icon;

  return (
    <div
      onClick={() => onRead(notif.id)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        padding: '0.9rem 1rem',
        borderRadius: '14px',
        background: notif.read ? 'rgba(255,255,255,0.02)' : cfg.bg,
        border: `1px solid ${notif.read ? 'rgba(255,255,255,0.06)' : cfg.color + '40'}`,
        cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
        opacity: notif.read ? 0.65 : 1,
        position: 'relative',
      }}
    >
      {/* unread dot */}
      {!notif.read && (
        <span style={{
          position: 'absolute', top: '10px', right: '10px',
          width: 7, height: 7, borderRadius: '50%',
          background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`,
        }} />
      )}

      {/* icon */}
      <div style={{
        width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
        background: `${cfg.color}1a`, border: `1px solid ${cfg.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} color={cfg.color} />
      </div>

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: cfg.color,
                         background: `${cfg.color}18`, border: `1px solid ${cfg.color}35`,
                         padding: '1px 7px', borderRadius: 99, letterSpacing: '0.04em' }}>
            {cfg.label.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>
            <Clock size={9} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
            {notif.time}
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)',
                    margin: '0 0 3px 0', lineHeight: 1.3 }}>{notif.title}</p>
        <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>{notif.body}</p>
        {notif.link && (
          <button
            onClick={e => { e.stopPropagation(); onNavigate && onNavigate(notif.link); }}
            style={{
              marginTop: '6px', fontSize: '0.68rem', fontWeight: 700,
              color: cfg.color, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, textDecoration: 'underline',
            }}
          >
            Go to {notif.link} →
          </button>
        )}
      </div>

      {/* dismiss */}
      <button
        onClick={e => { e.stopPropagation(); onDismiss(notif.id); }}
        title="Dismiss"
        style={{
          padding: '4px', borderRadius: '7px', background: 'none',
          border: '1px solid transparent', cursor: 'pointer',
          color: 'var(--text-3)', flexShrink: 0, transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--text-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
      ><X size={13} /></button>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────────────
export default function NotificationCenter({ onNavigate }) {
  const user    = useStore(s => s.user);
  const toast   = useToast();

  // Server notifications (from /api/notifications if available)
  const [serverNotifs, setServerNotifs] = useState([]);
  const [loading,      setLoading]      = useState(false);

  // Dismissed IDs (persisted to localStorage)
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif_dismissed') || '[]')); }
    catch { return new Set(); }
  });

  // Read IDs (session only)
  const [readIds, setReadIds] = useState(new Set());

  // Active type filter
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchServerNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiSync('/notifications', 'GET');
      if (Array.isArray(data)) setServerNotifs(data);
    } catch { /* endpoint may not exist yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchServerNotifs(); }, [fetchServerNotifs]);

  // Generate local notifs from store
  const localNotifs = useMemo(() => generateLocalNotifications(user), [user]);

  // Merge: server first, then local (dedup by id)
  const allNotifs = useMemo(() => {
    const merged = [...serverNotifs];
    const serverIds = new Set(serverNotifs.map(n => n.id));
    localNotifs.forEach(n => { if (!serverIds.has(n.id)) merged.push(n); });
    return merged;
  }, [serverNotifs, localNotifs]);

  // Apply dismissed + type filter
  const visible = useMemo(() => {
    let list = allNotifs.filter(n => !dismissed.has(n.id));
    if (typeFilter !== 'all') list = list.filter(n => n.type === typeFilter);
    return list;
  }, [allNotifs, dismissed, typeFilter]);

  const unreadCount = useMemo(() => visible.filter(n => !readIds.has(n.id) && !n.read).length, [visible, readIds]);

  // Counts per type for filter chips
  const typeCounts = useMemo(() => {
    const counts = {};
    allNotifs.filter(n => !dismissed.has(n.id)).forEach(n => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [allNotifs, dismissed]);

  const markRead = useCallback((id) => {
    setReadIds(prev => new Set([...prev, id]));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(new Set(visible.map(n => n.id)));
    toast.success('All notifications marked as read');
  }, [visible, toast]);

  const dismiss = useCallback((id) => {
    setDismissed(prev => {
      const next = new Set([...prev, id]);
      try { localStorage.setItem('notif_dismissed', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    const ids = visible.map(n => n.id);
    setDismissed(prev => {
      const next = new Set([...prev, ...ids]);
      try { localStorage.setItem('notif_dismissed', JSON.stringify([...next])); } catch {}
      return next;
    });
    toast.info('All notifications cleared');
  }, [visible, toast]);

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Bell size={22} color="var(--accent)" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                minWidth: 16, height: 16, borderRadius: 99,
                background: '#ef4444', color: '#fff',
                fontSize: '0.6rem', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', boxShadow: '0 0 8px rgba(239,68,68,0.6)',
              }}>{unreadCount}</span>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>
              Notifications
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '2px' }}>
              {visible.length} alert{visible.length !== 1 ? 's' : ''}
              {unreadCount > 0 && <span style={{ color: '#ef4444', marginLeft: '6px' }}>· {unreadCount} unread</span>}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchServerNotifs} title="Refresh"
            style={{ padding: '7px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)',
                     border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                     color: 'var(--text-3)', opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              style={{ display: 'flex', alignItems: 'center', gap: '5px',
                       padding: '7px 13px', borderRadius: '10px', fontSize: '0.75rem',
                       fontWeight: 700, background: 'rgba(255,255,255,0.06)',
                       border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                       color: 'var(--text-2)', transition: 'all 0.15s' }}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          {visible.length > 0 && (
            <button onClick={clearAll}
              style={{ display: 'flex', alignItems: 'center', gap: '5px',
                       padding: '7px 13px', borderRadius: '10px', fontSize: '0.75rem',
                       fontWeight: 700, background: 'rgba(239,68,68,0.08)',
                       border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                       color: '#ef4444', transition: 'all 0.15s' }}>
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Type filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[['all', 'All', visible.length], ...PRIORITY_ORDER.map(t => [
          t,
          TYPE_CONFIG[t].label,
          typeCounts[t] || 0,
        ])].map(([v, l, ct]) => {
          const active = typeFilter === v;
          const cfg = TYPE_CONFIG[v];
          return (
            <button key={v} onClick={() => setTypeFilter(v)}
              style={{
                padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                border: `1px solid ${active ? (cfg?.color || 'var(--accent)') + '60' : 'rgba(255,255,255,0.1)'}`,
                background: active ? (cfg?.color || 'var(--accent)') + '18' : 'transparent',
                color: active ? (cfg?.color || 'var(--accent)') : 'var(--text-3)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {l}{ct > 0 ? ` (${ct})` : ''}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>
          <BellOff size={40} style={{ opacity: 0.15, marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '4px' }}>
            You’re all caught up!
          </p>
          <p style={{ fontSize: '0.78rem' }}>
            {typeFilter !== 'all'
              ? 'No notifications of this type.'
              : 'No missed habits, overdue tasks, or upcoming goal deadlines.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {visible.map(notif => (
            <NotifCard
              key={notif.id}
              notif={{ ...notif, read: notif.read || readIds.has(notif.id) }}
              onRead={markRead}
              onDismiss={dismiss}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
