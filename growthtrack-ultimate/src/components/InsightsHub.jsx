import React, { Suspense, lazy, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Brain, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';
import { askLocalGrowthcast, buildGrowthcastSignal } from '../lib/growthcast';
import useHashTab, { handleTabKeyDown } from '../hooks/useHashTab';
import { formatDate } from '../utils/userFormatters';
import Button from './ui/Button';
import Card from './ui/Card';
import LoadingSkeleton from './ui/LoadingSkeleton';
import Tabs from './ui/Tabs';
import { uiMessages } from '../lib/uiMessages';

const Analytics = lazy(() => import('./Analytics'));
const Dashboards = lazy(() => import('./Dashboards'));
const TransformationPredictor = lazy(() => import('./TransformationPredictor'));
const Overview = lazy(() => import('./Overview'));
const Current = lazy(() => import('./Current'));
const Progress = lazy(() => import('./Progress'));

const TABS = [
  { id: 'overview', label: 'Overview', description: 'Your daily snapshot' },
  { id: 'current', label: 'Current', description: 'What needs attention now' },
  { id: 'analytics', label: 'Analytics', description: 'Correlations and trends' },
  { id: 'dashboards', label: 'Dashboard', description: 'Command-center view' },
  { id: 'progress', label: 'Progress', description: 'Logs and measurements' },
  { id: 'forecast', label: 'Forecast', description: 'Trajectory model' },
];
const TAB_IDS = TABS.map(item => item.id);

function ReadOnlySummary({ kind }) {
  const navigate = useNavigate();
  const state = useStore();
  const isProgress = kind === 'progress';
  const logs = state.metric_logs || [];
  const goals = state.goals || [];
  const count = isProgress ? logs.length : goals.length;
  const active = isProgress ? logs.filter(log => log?.date).length : goals.filter(goal => !['done', 'completed'].includes(String(goal?.status || '').toLowerCase())).length;
  const latest = isProgress ? logs[0]?.date : goals[0]?.title;
  return <Card className="insights-summary" aria-label={`Read-only ${kind} summary`}>
    <span className="eyebrow">Insights summary</span>
    <h2>{isProgress ? 'Progress at a glance' : 'Goals at a glance'}</h2>
    <p className="text-secondary">This is a read-only view of the data owned by the {isProgress ? 'Progress' : 'Goals'} module.</p>
    <div className="insights-summary__stats"><strong>{count}</strong><span>{isProgress ? 'saved measurements' : 'tracked goals'}</span><strong>{active}</strong><span>{isProgress ? 'dated entries' : 'active goals'}</span></div>
    {latest && <p className="text-secondary">Latest: {isProgress ? formatDate(latest) : latest}</p>}
    <Button onClick={() => navigate(`/${isProgress ? 'progress' : 'goals'}`)}>Open {isProgress ? 'Progress' : 'Goals'}</Button>
  </Card>;
}

export default function InsightsHub({ initialTab = 'overview', logs = [], setActiveTab }) {
  const [tab, selectTab] = useHashTab(TAB_IDS, initialTab);
  const state = useStore();
  const signal = useMemo(() => buildGrowthcastSignal(state), [state]);
  const [prompt, setPrompt] = useState('');
  const askMutation = useMutation({
    mutationFn: (question) => askLocalGrowthcast(question, state.appConfig?.aiAgent),
  });
  const ask = () => askMutation.mutate(prompt || `Summarize my momentum score ${signal.momentum}/100 and suggest one next action.`);

  return (
    <section className="module-page hub-page">
      <Card className="page-hero">
        <span className="eyebrow">Growthcast · Insights</span>
        <h1 className="text-display">See how far you’ve come.</h1>
        <p className="text-secondary">Explore your trends, review your goals, and decide what to focus on next.</p>
      </Card>

      <Tabs
        className="hub-tabs"
        label="Insights workspace"
        idPrefix="insights-tab"
        tabs={TABS.map(item => ({ value: item.id, label: item.label, description: item.description, panelId: 'insights-tabpanel' }))}
        value={tab}
        onChange={selectTab}
        onKeyDown={event => handleTabKeyDown(event, {
          tabs: TABS,
          activeTab: tab,
          selectTab,
          idPrefix: 'insights-tab',
        })}
      />

      <Card className="growthcast-card">
        <div>
          <span className="eyebrow"><Brain size={14} /> Growthcast models</span>
          <h3>Momentum {signal.momentum}/100</h3>
          <p className="text-secondary">Data confidence {signal.dataConfidence}%. It improves as you save real goals, habits, and measurements.</p>
        </div>
        <div className="growthcast-actions">
          <label className="sr-only" htmlFor="growthcast-question">Ask the local Growthcast Agent</label>
          <input
            id="growthcast-question"
            className="form-input"
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            placeholder="Ask your local Growthcast…"
          />
          <Button icon={<Sparkles size={16} />} onClick={ask} loading={askMutation.isPending} loadingLabel="Thinking…">Ask Agent</Button>
        </div>
        {askMutation.data && <p className="growthcast-answer" role="status">{askMutation.data}</p>}
        {askMutation.isError && <p className="growthcast-answer" role="alert">{uiMessages.connection} Your local Growthcast service may be unavailable.</p>}
      </Card>

      <div
        id="insights-tabpanel"
        role="tabpanel"
        aria-labelledby={`insights-tab-${tab}`}
        tabIndex={0}
      >
        <Suspense fallback={<LoadingSkeleton variant="insights" />}>
          {tab === 'overview' && <Overview setActiveTab={setActiveTab} />}
          {tab === 'current' && <Current />}
          {tab === 'analytics' && <Analytics />}
          {tab === 'dashboards' && <Dashboards />}
          {tab === 'progress' && <Progress />}
          {tab === 'forecast' && <TransformationPredictor logs={logs} />}
        </Suspense>
      </div>
    </section>
  );
}
