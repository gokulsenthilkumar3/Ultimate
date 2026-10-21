import React, { Suspense, lazy, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Brain, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';
import { askLocalGrowthcast } from '../lib/growthcast';
import { buildGrowthcastSummary } from '../utils/growthcast';
import useHashTab from '../hooks/useHashTab';
import { formatDate } from '../utils/userFormatters';
import Button from './ui/Button';
import Card from './ui/Card';
import LoadingSkeleton from './ui/LoadingSkeleton';
import { uiMessages } from '../lib/uiMessages';

const Analytics = lazy(() => import('./Analytics'));
const Dashboards = lazy(() => import('./Dashboards'));
const TransformationPredictor = lazy(() => import('./TransformationPredictor'));
const Overview = lazy(() => import('./Overview'));
const Current = lazy(() => import('./Current'));
const ActionCenter = lazy(() => import('./ActionCenter'));
const TAB_IDS = ['actions', 'overview', 'current', 'analytics', 'dashboards', 'progress', 'forecast'];

function ReadOnlyProgressSummary() {
  const state = useStore();
  const summary = useMemo(() => buildGrowthcastSummary(state), [state]);
  return <Card className="insights-summary" aria-label="Read-only progress summary">
    <h2>Progress at a glance</h2>
    <p className="text-secondary">A read-only summary across measurements, goals, tasks, habits, and sleep.</p>
    <dl className="insights-summary__stats">
      <dt>Saved measurement records</dt><dd>{summary.measurementCount}</dd>
      <dt>Distinct dated entries</dt><dd>{summary.observedDates}</dd>
      <dt>Completed goals</dt><dd>{summary.completedGoals} of {summary.goalCount}</dd>
      <dt>Pending tasks</dt><dd>{summary.pendingTasks}</dd>
      <dt>Tracked habits</dt><dd>{summary.habitCount}</dd>
      <dt>Saved sleep records</dt><dd>{summary.sleepCount}</dd>
    </dl>
    <p className="text-secondary">Latest measurement date: {summary.latestDate ? formatDate(summary.latestDate, state.user) : 'Not recorded'}</p>
    <Link to="/wellness/physique?view=history">Open measurement history</Link>
    {' · '}<Link to="/hub/logs">Open canonical logs</Link>
  </Card>;
}

function OwningModule({ tab, logs, setActiveTab }) {
  const storeLogs = useStore(state => state.metric_logs);
  return <Suspense fallback={<LoadingSkeleton variant="insights" />}>
    {tab === 'overview' && <Overview setActiveTab={setActiveTab} />}
    {tab === 'actions' && <ActionCenter />}
    {tab === 'current' && <Current />}
    {tab === 'analytics' && <Analytics />}
    {tab === 'dashboards' && <Dashboards />}
    {tab === 'progress' && <ReadOnlyProgressSummary />}
    {tab === 'forecast' && <TransformationPredictor logs={storeLogs ?? logs} />}
  </Suspense>;
}

function InsightsCommand({ logs, setActiveTab }) {
  const [tab] = useHashTab(TAB_IDS, 'overview');
  const state = useStore();
  const summary = useMemo(() => buildGrowthcastSummary(state), [state]);
  const [prompt, setPrompt] = useState('');
  const askMutation = useMutation({
    mutationFn: question => askLocalGrowthcast(question, state.appConfig?.aiAgent),
  });
  if (tab !== 'overview') return <OwningModule tab={tab} logs={logs} setActiveTab={setActiveTab} />;
  const ask = () => askMutation.mutate(
    'Saved record counts (not scores): ' + JSON.stringify(summary)
    + '. Do not infer momentum, confidence, improvement, or missing measurements from record counts. '
    + (prompt.trim() || 'Summarize these saved records and suggest one next action.'),
  );
  return <section className="module-page hub-page">
    <Card className="page-hero">
      <span className="eyebrow">Insights</span>
      <h1 className="text-display">See how far you’ve come.</h1>
      <p className="text-secondary">Review saved activity and explore measured trends.</p>
    </Card>
    <ReadOnlyProgressSummary />
    <nav aria-label="Insight destinations" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
      <Link to="/insights/actions">Action Center</Link>
      <Link to="/insights/current">Current</Link>
      <Link to="/insights/analytics">Analytics</Link>
      <Link to="/insights/dashboards">Dashboards</Link>
      <Link to="/insights/forecast">Forecast</Link>
    </nav>
    <Card className="growthcast-card">
      <div>
        <span className="eyebrow"><Brain size={14} /> Local Growthcast Agent</span>
        <h3>Ask about your saved activity</h3>
        <p className="text-secondary">The agent receives the record counts shown here and your question.</p>
      </div>
      <div className="growthcast-actions">
        <label className="sr-only" htmlFor="growthcast-question">Ask the local Growthcast Agent</label>
        <input id="growthcast-question" className="form-input" value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Ask your local Growthcast…" />
        <Button icon={<Sparkles size={16} />} onClick={ask} loading={askMutation.isPending} loadingLabel="Thinking…">Ask Agent</Button>
      </div>
      {askMutation.data && <p className="growthcast-answer" role="status">{askMutation.data}</p>}
      {askMutation.isError && <p className="growthcast-answer" role="alert">{uiMessages.connection} Your local Growthcast service may be unavailable.</p>}
    </Card>
  </section>;
}

export default function InsightsHub({ initialTab, logs, setActiveTab }) {
  // The canonical route owns module navigation. Nested modules ignore legacy hashes.
  return TAB_IDS.includes(initialTab)
    ? <OwningModule tab={initialTab} logs={logs} setActiveTab={setActiveTab} />
    : <InsightsCommand logs={logs} setActiveTab={setActiveTab} />;
}
