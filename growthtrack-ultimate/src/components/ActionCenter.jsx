import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Droplets, Moon, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import Card from './ui/Card';
import Button from './ui/Button';

const STORAGE_KEY = 'growthtrack-action-center-state';
const EMPTY_LIST = Object.freeze([]);
const today = () => new Date().toISOString().slice(0, 10);
const isDone = item => Boolean(item?.completed || item?.done || ['done', 'completed'].includes(String(item?.status || '').toLowerCase()));

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function ActionCard({ action, onDismiss, onSnooze, onOpen }) {
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
          <button className="btn-ghost" onClick={onSnooze}>Snooze</button>
          <button className="btn-ghost" onClick={onDismiss}>Not relevant</button>
        </div>
      </div>
    </article>
  );
}

export default function ActionCenter() {
  const navigate = useNavigate();
  const state = useStore();
  const [saved, setSaved] = useState(readState);
  const [nowMs] = useState(() => Date.now());
  const tasks = state.tasks || EMPTY_LIST;
  const habits = state.habits || EMPTY_LIST;
  const goals = state.goals || EMPTY_LIST;
  const sleepLogs = state.sleep_logs || EMPTY_LIST;
  const hydration = state.hydration_logs || state.hydrationLogs || EMPTY_LIST;
  const checkInDate = state.lastCheckIn || state.last_check_in;
  const actions = useMemo(() => {
    const result = [];
    const now = today();
    const activeTasks = tasks.filter(t => !isDone(t));
    const overdue = activeTasks.filter(t => (t.due_date || t.dueDate || '') < now && (t.due_date || t.dueDate));
    if (overdue.length) result.push({ id: 'overdue-tasks', priority: 'high', urgency: 'Needs attention', source: 'Tasks', icon: AlertTriangle, title: `Clear ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}`, reason: 'A small cleanup pass will restore momentum and make your current priorities visible.', cta: 'Open tasks', tab: 'tasks' });
    const latestSleep = [...sleepLogs].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    if (latestSleep && Number(latestSleep.duration) > 0 && Number(latestSleep.duration) < 7) result.push({ id: 'low-sleep', priority: 'medium', urgency: 'Recovery signal', source: 'Sleep', icon: Moon, title: 'Protect tonight’s recovery', reason: `Your latest sleep entry was ${latestSleep.duration} hours. Plan an earlier wind-down before pushing harder.`, cta: 'Open sleep', tab: 'sleep' });
    const incompleteHabits = habits.filter(h => !((state.habitLogsByHabit?.[h.id] || []).some(log => log.date === now && log.completed !== false)));
    if (incompleteHabits.length) result.push({ id: 'habits-today', priority: 'medium', urgency: 'Today', source: 'Habits', icon: CheckCircle2, title: `Complete ${incompleteHabits.length} habit${incompleteHabits.length === 1 ? '' : 's'} today`, reason: 'Your routine is strongest when the next check-off is obvious and timely.', cta: 'Open habits', tab: 'habits' });
    const activeGoal = goals.find(g => !isDone(g));
    if (activeGoal) result.push({ id: 'goal-next-step', priority: 'low', urgency: 'Keep moving', source: 'Goals', icon: Target, title: `Take the next step on “${activeGoal.title || 'your goal'}”`, reason: 'Turn the goal into one measurable action before the day gets crowded.', cta: 'Open goals', tab: 'goals' });
    if (!hydration.length) result.push({ id: 'hydration-data', priority: 'low', urgency: 'Missing data', source: 'Hydration', icon: Droplets, title: 'Log your first hydration entry', reason: 'One real entry unlocks hydration trends and makes recovery recommendations more useful.', cta: 'Open hydration', tab: 'hydration' });
    if (!checkInDate || checkInDate.slice(0, 10) !== now) result.push({ id: 'daily-checkin', priority: 'medium', urgency: 'Missing data', source: 'Daily check-in', icon: Clock3, title: 'Complete today’s check-in', reason: 'A quick check-in gives Insights current mood, energy, and readiness context.', cta: 'Start check-in', tab: 'overview' });
    return result.slice(0, 5);
  }, [tasks, habits, goals, sleepLogs, hydration, checkInDate, state.habitLogsByHabit]);
  const visible = actions.filter(action => !saved.dismissed?.includes(action.id) && (!saved.snoozed?.[action.id] || saved.snoozed[action.id] < nowMs));
  const update = next => { setSaved(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };
  const dismiss = id => update({ ...saved, dismissed: [...new Set([...(saved.dismissed || []), id])] });
  const snooze = id => update({ ...saved, snoozed: { ...(saved.snoozed || {}), [id]: nowMs + 24 * 60 * 60 * 1000 } });
  return <section className="module-page action-center" aria-labelledby="action-center-title">
    <Card className="page-hero"><span className="eyebrow">GrowthTrack · Daily guidance</span><h1 id="action-center-title" className="text-display">Your next best actions.</h1><p className="text-secondary">A focused list built from your real tasks, habits, goals, recovery, and check-ins.</p></Card>
    <div className="action-center__summary" role="status"><strong>{visible.length}</strong><span>{visible.length === 1 ? 'priority to review' : 'priorities to review'}</span><span className="action-center__confidence">Local data only · no invented recommendations</span></div>
    {visible.length ? <div className="action-center__list">{visible.map(action => <ActionCard key={action.id} action={action} onDismiss={() => dismiss(action.id)} onSnooze={() => snooze(action.id)} onOpen={() => navigate(`/${action.tab}`)} />)}</div> : <Card><div className="action-center__empty"><CheckCircle2 size={28} /><h2>You’re caught up.</h2><p>Keep logging real progress and this space will surface the next useful step.</p><Button onClick={() => navigate('/insights')}>Review Insights</Button></div></Card>}
  </section>;
}
