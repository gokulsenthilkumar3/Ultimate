import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Brain, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';
import { askLocalGrowthcast, buildGrowthcastSignal } from '../lib/growthcast';
const Analytics = lazy(() => import('./Analytics'));
const Dashboards = lazy(() => import('./Dashboards'));
const TransformationPredictor = lazy(() => import('./TransformationPredictor'));
const TABS = [{ id: 'analytics', label: 'Analytics', description: 'Correlations and trends' }, { id: 'dashboards', label: 'Dashboards', description: 'Command-center views' }, { id: 'forecast', label: 'Growth Forecast', description: 'ML-style trajectory model' }];
export default function InsightsHub({ initialTab = 'analytics', logs = [] }) {
  const [tab, setTab] = useState(initialTab); const state = useStore();
  const signal = useMemo(() => buildGrowthcastSignal(state), [state]);
  const [prompt, setPrompt] = useState(''); const [answer, setAnswer] = useState(''); const [asking, setAsking] = useState(false);
  const ask = async () => { setAsking(true); try { setAnswer(await askLocalGrowthcast(prompt || `Summarize my momentum score ${signal.momentum}/100 and suggest one next action.`)); } catch { setAnswer('Ollama is not running. Start it locally, then try again.'); } finally { setAsking(false); } };
  return <section className="module-page hub-page"><div className="page-hero glass-card"><span className="eyebrow">Growthcast · Insights</span><h1 className="text-display">One place for your signal</h1><p className="text-secondary">Analytics, dashboards, forecasts, and audit context are now a single insights workspace.</p></div><div className="growthcast-card glass-card"><div><span className="eyebrow"><Brain size={14} /> Growthcast models</span><h3>Momentum {signal.momentum}/100</h3><p className="text-secondary">Trajectory ML confidence {signal.dataConfidence}%. The forecast improves as you log goals, habits, and measurements.</p></div><div className="growthcast-actions"><input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask your local Growthcast…" /><button className="btn-primary" onClick={ask} disabled={asking}><Sparkles size={14} /> {asking ? 'Thinking…' : 'Ask Ollama'}</button></div>{answer && <p className="growthcast-answer">{answer}</p>}</div><div className="hub-tabs" role="tablist" aria-label="Insights workspace">{TABS.map(item => <button key={item.id} className={`hub-tab ${tab === item.id ? 'is-active' : ''}`} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div><Suspense fallback={<div className="hub-loading"><div className="spin-ring" /> Loading insights…</div>}>{tab === 'analytics' && <Analytics />}{tab === 'dashboards' && <Dashboards />}{tab === 'forecast' && <TransformationPredictor logs={logs} />}</Suspense></section>;
}
