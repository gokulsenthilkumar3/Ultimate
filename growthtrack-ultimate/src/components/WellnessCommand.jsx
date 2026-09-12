import React, { lazy, Suspense, useState } from 'react';
import { HeartPulse, Activity, Moon } from 'lucide-react';
import useStore from '../store/useStore';
import { handleTabKeyDown } from '../hooks/useHashTab';
import Card from './ui/Card';
import LoadingSkeleton from './ui/LoadingSkeleton';
import Tabs from './ui/Tabs';

const Overview = lazy(() => import('./Overview'));
const SleepDashboard = lazy(() => import('./SleepDashboard'));
const Lifestyle = lazy(() => import('./Lifestyle'));
const MindWellness = lazy(() => import('./MindWellness'));
const Medical = lazy(() => import('./Medical'));
const HealthExtras = lazy(() => import('./HealthExtras'));
const HabitsMatrix = lazy(() => import('./HabitsMatrix'));
const Physique = lazy(() => import('./Physique'));
const Assessment = lazy(() => import('./Assessment'));
const Training = lazy(() => import('./Training'));
const StrengthMetrics = lazy(() => import('./StrengthMetrics'));
const Nutrition = lazy(() => import('./Nutrition'));
const HydrationTracker = lazy(() => import('./HydrationTracker'));

const AREAS = [
  ['overview', 'Overview', Overview], ['sleep', 'Sleep', SleepDashboard], ['lifestyle', 'Lifestyle', Lifestyle],
  ['mind', 'Mind & Wellness', MindWellness], ['medical', 'Medical', Medical], ['health', 'Health+', HealthExtras],
  ['habits', 'Habits', HabitsMatrix], ['physique', 'Physique', Physique], ['assessment', 'Assessment', Assessment],
  ['training', 'Training', Training], ['strength', 'Strength', StrengthMetrics], ['nutrition', 'Nutrition', Nutrition],
  ['hydration', 'Hydration', HydrationTracker],
];

function AreaLoading() {
  return <LoadingSkeleton variant="wellness" />;
}

export default function WellnessCommand({ user, setActiveTab }) {
  const [activeArea, setActiveArea] = useState('overview');
  const habits = useStore(s => s.habits) || [];
  const sleep = useStore(s => s.sleepLogs) || [];
  const metrics = useStore(s => s.metricLogs) || [];
  const ActiveArea = AREAS.find(([id]) => id === activeArea)?.[2] || Overview;
  const cards = [
    { label: 'Habits tracked', value: habits.length, icon: Activity, color: 'var(--gt-success)' },
    { label: 'Sleep entries', value: sleep.length, icon: Moon, color: 'var(--gt-action)' },
    { label: 'Health metrics', value: metrics.length, icon: HeartPulse, color: 'var(--gt-warning)' },
  ];
  return <div className="module-page wellness-command">
    <Card className="page-header wellness-command__header"><div><p className="eyebrow">Wellness</p><h1>Feel well, one day at a time.</h1><p className="page-subtitle">A clear view of your sleep, habits, movement, and energy.</p></div><div className="wellness-command__pulse"><HeartPulse size={18} aria-hidden="true" /> Your wellness workspace</div></Card>
    <Tabs className="wellness-command__tabs" label="Wellness areas" idPrefix="wellness-tab" tabs={AREAS.map(([id, label]) => ({ value: id, label, panelId: 'wellness-area-panel' }))} value={activeArea} onChange={setActiveArea} onKeyDown={event => handleTabKeyDown(event, { tabs: AREAS.map(([id]) => ({ id })), activeTab: activeArea, selectTab: setActiveArea, idPrefix: 'wellness-tab' })} />
    {activeArea === 'overview' && <div className="dashboard-grid dashboard-grid--three wellness-command__stats">{cards.map(({ label, value, icon: Icon, color }) => <Card key={label} className="wellness-command__stat" style={{ '--wellness-stat': color }}><Icon size={20} color={color} aria-hidden="true" /><strong>{value}</strong><span>{label}</span></Card>)}</div>}
    <section id="wellness-area-panel" role="tabpanel" aria-labelledby={`wellness-tab-${activeArea}`}><Suspense fallback={<AreaLoading />}><ActiveArea user={user} setActiveTab={setActiveTab} /></Suspense></section>
  </div>;
}
