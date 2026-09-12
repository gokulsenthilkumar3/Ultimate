import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Brain, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';
import { askLocalGrowthcast, buildGrowthcastSignal } from '../lib/growthcast';
import useHashTab, { handleTabKeyDown } from '../hooks/useHashTab';

const Analytics = lazy(() => import('./Analytics'));
const Dashboards = lazy(() => import('./Dashboards'));
const TransformationPredictor = lazy(() => import('./TransformationPredictor'));
const Progress = lazy(() => import('./Progress'));
const GoalsDashboard = lazy(() => import('./GoalsDashboard'));

const TABS = [
  { id: 'analytics', label: 'Analytics', description: 'Correlations and trends' },
  { id: 'dashboards', label: 'Dashboard', description: 'Command-center view' },
  { id: 'progress', label: 'Progress', description: 'Logs and measurements' },
  { id: 'goals', label: 'Goals', description: 'Targets and outcomes' },
  { id: 'forecast', label: 'Forecast', description: 'Trajectory model' },
];
const TAB_IDS = TABS.map(item => item.id);

export default function InsightsHub({ initialTab = 'analytics', logs = [] }) {
  const [tab, selectTab] = useHashTab(TAB_IDS, initialTab);
  const state = useStore();
  const signal = useMemo(() => buildGrowthcastSignal(state), [state]);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  const ask = async () => {
    setAsking(true);
    try {
      setAnswer(await askLocalGrowthcast(
        prompt || `Summarize my momentum score ${signal.momentum}/100 and suggest one next action.`,
        state.appConfig?.aiAgent,
      ));
    } catch {
      setAnswer('The local Agent is unavailable. Check its configuration and service status.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="module-page hub-page">
      <div className="page-hero glass-card">
        <span className="eyebrow">Growthcast · Insights</span>
        <h1 className="text-display">See how far you’ve come.</h1>
        <p className="text-secondary">Explore your trends, review your goals, and decide what to focus on next.</p>
      </div>

      <div className="growthcast-card glass-card">
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
          <button className="btn-primary" onClick={ask} disabled={asking}>
            <Sparkles size={14} /> {asking ? 'Thinking…' : 'Ask Agent'}
          </button>
        </div>
        {answer && <p className="growthcast-answer" aria-live="polite">{answer}</p>}
      </div>

      <div
        className="hub-tabs"
        role="tablist"
        aria-label="Insights workspace"
        onKeyDown={event => handleTabKeyDown(event, {
          tabs: TABS,
          activeTab: tab,
          selectTab,
          idPrefix: 'insights-tab',
        })}
      >
        {TABS.map(item => (
          <button
            key={item.id}
            id={`insights-tab-${item.id}`}
            className={`hub-tab ${tab === item.id ? 'is-active' : ''}`}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls="insights-tabpanel"
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => selectTab(item.id)}
          >
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </div>

      <div
        id="insights-tabpanel"
        role="tabpanel"
        aria-labelledby={`insights-tab-${tab}`}
        tabIndex={0}
      >
        <Suspense fallback={<div className="hub-loading"><div className="spin-ring" /> Loading insights…</div>}>
          {tab === 'analytics' && <Analytics />}
          {tab === 'dashboards' && <Dashboards />}
          {tab === 'progress' && <Progress />}
          {tab === 'goals' && <GoalsDashboard />}
          {tab === 'forecast' && <TransformationPredictor logs={logs} />}
        </Suspense>
      </div>
    </section>
  );
}
