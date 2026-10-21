import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Droplets, Moon, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import Card from './ui/Card';
import Button from './ui/Button';

const EMPTY_LIST = Object.freeze([]);
const today = () => new Date().toISOString().slice(0, 10);
const isDone = item => Boolean(item?.completed || item?.done || ['done', 'completed'].includes(String(item?.status || '').toLowerCase()));

function ActionCard({ action, onDismiss, onSnooze, onOpen, saving }) {
  const Icon = action.icon || Zap;
  return (
    <article className="glass-card action-center__item" data-priority={action.priority}>
      <div className="action-center__icon" aria-hidden="true"><Icon size={18} /></div>
      <div className="action-center__body">
        <div className="action-center__meta"><span>{action.urgency}</span><span>{action.source}</span></div>
        <h3>{action.title}</h3>
        <p>{action.reason}</p>
        <div className="action-center__actions">
          <Button icon={<ArrowRight size={15} />} onClick={onOpen}>{action.cta}</Button>
          <button className="btn-ghost" disabled={saving} onClick={onSnooze}>Snooze</button>
          <button className="btn-ghost" disabled={saving} onClick={onDismiss}>Not relevant</button>
        </div>
      </div>
    </article>
  );
}

export default function ActionCenter() {
  const navigate = useNavigate();
  const state = useStore();
  const saved = state.wellnessData?.actionCenter || {};
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNowMs(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  useEffect(() => { setSaveError(''); }, [state.user?.id]);
  const tasks = useMemo(() => [...(state.user?.tasks?.pending || EMPTY_LIST), ...(state.user?.tasks?.completed || EMPTY_LIST)], [state.user?.tasks]);
  const habits = state.habits || EMPTY_LIST;
  const goals = state.goals || EMPTY_LIST;
  const sleepLogs = state.sleep_logs || EMPTY_LIST;
  const hydration = useMemo(() => (state.metric_logs || EMPTY_LIST).filter(log => log.metric === 'hydration'), [state.metric_logs]);
  const checkInDate = state.lastCheckIn || state.moodLogs?.find(log => log.date === today())?.date;
  const actions = useMemo(() => {
    const result = [];
    const now = today();
    const activeTasks = tasks.filter(t => !isDone(t));
    const overdue = activeTasks.filter(t => (t.due_date || t.dueDate || '') < now && (t.due_date || t.dueDate));
    if (overdue.length) result.push({ id: 'overdue-tasks', priority: 'high', urgency: 'Needs attention', source: 'Tasks', icon: AlertTriangle, title: `Clear ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}`, reason: 'A small cleanup pass will restore momentum and make your current priorities visible.', cta: 'Open tasks', tab: 'tasks' });
    const latestSleep = [...sleepLogs].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const sleepHours = Number(latestSleep?.duration ?? latestSleep?.hours);
    if (sleepHours > 0 && sleepHours < 7) result.push({ id: 'low-sleep', priority: 'medium', urgency: 'Recovery signal', source: 'Sleep', icon: Moon, title: 'Protect tonight’s recovery', reason: `Your latest sleep entry was ${sleepHours} hours. Plan an earlier wind-down before pushing harder.`, cta: 'Open sleep', tab: 'sleep' });
    const incompleteHabits = habits.filter(h => !(h.completed_dates || []).includes(now) && !((state.habitLogsByHabit?.[h.id] || []).some(log => log.date === now && log.completed !== false)));
    if (incompleteHabits.length) result.push({ id: 'habits-today', priority: 'medium', urgency: 'Today', source: 'Habits', icon: CheckCircle2, title: `Complete ${incompleteHabits.length} habit${incompleteHabits.length === 1 ? '' : 's'} today`, reason: 'Your routine is strongest when the next check-off is obvious and timely.', cta: 'Open habits', tab: 'habits' });
    const activeGoal = goals.find(g => !isDone(g));
    if (activeGoal) result.push({ id: 'goal-next-step', priority: 'low', urgency: 'Keep moving', source: 'Goals', icon: Target, title: `Take the next step on “${activeGoal.title || 'your goal'}”`, reason: 'Turn the goal into one measurable action before the day gets crowded.', cta: 'Open goals', tab: 'goals' });
    if (!hydration.length) result.push({ id: 'hydration-data', priority: 'low', urgency: 'Missing data', source: 'Hydration', icon: Droplets, title: 'Log your first hydration entry', reason: 'One real entry unlocks hydration trends and makes recovery recommendations more useful.', cta: 'Open hydration', tab: 'hydration' });
    if (!checkInDate || checkInDate.slice(0, 10) !== now) result.push({ id: 'daily-checkin', priority: 'medium', urgency: 'Missing data', source: 'Daily check-in', icon: Clock3, title: 'Complete today’s check-in', reason: 'A quick check-in gives Insights current mood, energy, and readiness context.', cta: 'Start check-in', tab: 'overview' });
    return result.slice(0, 5);
  }, [tasks, habits, goals, sleepLogs, hydration, checkInDate, state.habitLogsByHabit, nowMs]);
  const dismissed = Array.isArray(saved.dismissed) ? saved.dismissed : [];
  const visible = actions.filter(action => !dismissed.includes(action.id) && (!saved.snoozed?.[action.id] || saved.snoozed[action.id] <= nowMs));
  const update = async updater => {
    if (saving) return;
    setSaving(true); setSaveError('');
    try { await state.updateActionCenterState(updater); }
    catch (error) { setSaveError(error?.message || 'This action could not be saved. Try again.'); }
    finally { setSaving(false); }
  };
  const dismiss = id => update(previous => ({ ...previous, dismissed: [...new Set([...(Array.isArray(previous.dismissed) ? previous.dismissed : []), id])] }));
  const snooze = id => update(previous => ({ ...previous, snoozed: { ...(previous.snoozed || {}), [id]: Date.now() + 24 * 60 * 60 * 1000 } }));
  return <section className="module-page action-center" aria-labelledby="action-center-title">
    <Card className="page-hero"><span className="eyebrow">GrowthTrack · Daily guidance</span><h1 id="action-center-title" className="text-display">Your next best actions.</h1><p className="text-secondary">A focused list built from your real tasks, habits, goals, recovery, and check-ins.</p></Card>
    {saveError && <p role="alert">{saveError}</p>}
    <div className="action-center__summary" role="status"><strong>{visible.length}</strong><span>{visible.length === 1 ? 'priority to review' : 'priorities to review'}</span><span className="action-center__confidence">Local data only · no invented recommendations</span></div>
    {visible.length ? <div className="action-center__list">{visible.map(action => <ActionCard key={action.id} action={action} saving={saving || !state.user?.id} onDismiss={() => dismiss(action.id)} onSnooze={() => snooze(action.id)} onOpen={() => navigate(`/${action.tab}`)} />)}</div> : <Card><div className="action-center__empty"><CheckCircle2 size={28} /><h2>You’re caught up.</h2><p>Keep logging real progress and this space will surface the next useful step.</p><Button onClick={() => navigate('/insights')}>Review Insights</Button></div></Card>}
  </section>;
}
