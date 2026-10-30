import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Box, CalendarDays, CheckCircle2, Ruler, Scale, Target } from 'lucide-react';
import useHashTab from '../hooks/useHashTab';
import '../styles/physique-compat.css';
import useStore from '../store/useStore';
import { useToast } from '../hooks/useToast';
import { EMPTY_LIST } from '../lib/emptyValues';
import { bodyProfileToGoals, bodyProfileToMetrics, mergeBodyProfileSources } from '../lib/physiqueProfile';
import { formatDate } from '../utils/userFormatters';
import Button from './ui/Button';
import Tabs from './ui/Tabs';
import SelectField from './ui/SelectField';
import { WORKSPACE_VIEWS, formatBodyValue, physiqueHistory, targetRows } from './physique/physiqueWorkspace';
import '../styles/physique-workspace.css';
import use3DStore from '../store/use3DStore';

const ScrollShowcase = lazy(() => import('./ScrollShowcase'));
const MeasurementWorkbench = lazy(() => import('./physique/MeasurementWorkbench'));
const TargetWorkbench = lazy(() => import('./physique/TargetWorkbench'));
const PhysiqueHistory = lazy(() => import('./physique/PhysiqueHistory'));
const PanelLoading = () => <p className="px-card px-panel-loading" role="status">Opening workspace…</p>;
const EMPTY_OBJECT = Object.freeze({});
const VIEW_IDS = WORKSPACE_VIEWS.map(view => view.value);
const BASIC_KEYS = ['height', 'weight', 'bodyFat', 'waist', 'neck', 'hips', 'chest', 'shoulders', 'arms', 'thighs', 'calves'];
const PHASES = ['Cutting', 'Maintenance', 'Hypertrophy', 'Power', 'Recomp'];

export default function Physique({ user: suppliedUser }) {
  const storedUser = useStore(state => state.user);
  const user = suppliedUser || storedUser || EMPTY_OBJECT;
  const bodyProfile = useStore(state => state.bodyProfile) || EMPTY_OBJECT;
  const saved = useStore(state => state.physiqueTargets) || EMPTY_OBJECT;
  const metricLogs = useStore(state => state.metric_logs) || EMPTY_LIST;
  const saveProfile = useStore(state => state.updateBodyProfile);
  const saveTargets = useStore(state => state.updatePhysiqueTargets);
  const saveSnapshot = useStore(state => state.saveMetricLog);
  const [view, selectView] = useHashTab(VIEW_IDS, 'blueprint');
  const [visitedViews, setVisitedViews] = useState(() => new Set([view]));
  useEffect(() => {
    setVisitedViews(visited => visited.has(view) ? visited : new Set([...visited, view]));
  }, [view]);
  const [savingZone, setSavingZone] = useState(null);
  const toast = useToast();
  const profile = useMemo(() => mergeBodyProfileSources(bodyProfile, user), [bodyProfile, user]);
  const current = useMemo(() => bodyProfileToMetrics(profile), [profile]);
  const goals = useMemo(() => bodyProfileToGoals(profile, saved), [profile, saved]);
  const history = useMemo(() => physiqueHistory(metricLogs), [metricLogs]);
  const rows = useMemo(() => targetRows(saved.targets, current, goals), [saved.targets, current, goals]);
  const zones = Array.isArray(saved.zones) ? saved.zones : [];
  const basicsRecorded = BASIC_KEYS.filter(key => Number.isFinite(current[key])).length;
  const latest = history.at(-1);
  const openMeasurements = () => selectView('measurements');

  const setZonePhase = async (index, phase) => {
    if (!PHASES.includes(phase)) return;
    setSavingZone(index);
    try {
      await saveTargets({ ...saved, zones: zones.map((zone, i) => i === index ? { ...zone, status: phase } : zone) });
      toast.success('Training focus updated');
    } catch { toast.error('Training focus could not be saved. Please retry.'); }
    finally { setSavingZone(null); }
  };

  return <div className="physique-page physique-workspace" data-view={view}>
    <header className="px-page-header">
      <div><span className="px-eyebrow">Wellness / Physique</span><h1>{view === '3d' ? '3D Mirror' : 'Your body, in perspective.'}</h1>{view !== '3d' && <p>Know where you are. Choose your next step. See what changes.</p>}</div>
      <div className="px-action-row">{view !== '3d' && <Button variant="secondary" onClick={() => selectView('3d')} icon={<Box size={17} />}>Open 3D Mirror</Button>}<Button variant={view === '3d' ? 'secondary' : 'primary'} onClick={openMeasurements} icon={<Ruler size={17} />}>Record a check-in</Button></div>
    </header>

    <Tabs label="Physique views" idPrefix="physique-tab" className="px-view-tabs" tabs={view === '3d' ? WORKSPACE_VIEWS.map(tab => ({ ...tab, description: undefined })) : WORKSPACE_VIEWS} value={view} onChange={selectView} />

    <section hidden={view !== 'blueprint'} id="physique-panel-blueprint" role="tabpanel" aria-labelledby="physique-tab-blueprint" tabIndex={0} className="px-panel">
      <div className="px-stat-grid">
        {[
          { label: 'Weight', value: formatBodyValue(current.weight, 'kg', user), icon: Scale },
          { label: 'Body fat', value: formatBodyValue(current.bodyFat, '%', user), icon: Activity },
          { label: 'Waist', value: formatBodyValue(current.waist, 'cm', user), icon: Ruler },
          { label: 'Latest check-in', value: latest ? formatDate(latest.date, user, { month: 'short', day: 'numeric' }) : 'Not logged', icon: CalendarDays },
        ].map(({ label, value, icon }) => <article className="px-stat" key={label}><span>{React.createElement(icon, { size: 16, 'aria-hidden': true })}{label}</span><strong>{value}</strong><small>{label === 'Latest check-in' ? history.length + ' recorded check-ins' : value === '—' ? 'Add a measurement to get started' : 'From your recorded profile'}</small></article>)}
      </div>
      <div className="px-blueprint-grid">
        <section className="px-card px-body-card">
          <div className="px-section-heading"><div><span className="px-eyebrow">Built around your measurements</span><h2>Your physique blueprint</h2></div><span className="px-unit-badge"><CheckCircle2 size={14} />{basicsRecorded} / {BASIC_KEYS.length} essentials</span></div>
          <div className="px-body-guide">
            <BodyGuide />
            <div className="px-body-label px-body-label--height"><span>Height</span><strong>{formatBodyValue(current.height, 'cm', user)}</strong></div>
            <div className="px-body-label px-body-label--chest"><span>Chest</span><strong>{formatBodyValue(current.chest, 'cm', user)}</strong></div>
            <div className="px-body-label px-body-label--waist"><span>Waist</span><strong>{formatBodyValue(current.waist, 'cm', user)}</strong></div>
            <div className="px-body-label px-body-label--hips"><span>Hips</span><strong>{formatBodyValue(current.hips, 'cm', user)}</strong></div>
          </div>
          <div className="px-body-card__footer"><p>A simple guide to your saved measurements. Explore your digital twin from every angle in the 3D Mirror.</p><Button variant="secondary" onClick={() => selectView('3d')} icon={<Box size={16} />}>Explore your mirror</Button></div>
        </section>
        <div className="px-overview-stack">
          <section className="px-card px-goal-preview"><div className="px-section-heading"><div><span className="px-eyebrow">A direction of your own</span><h2>What you’re working toward</h2></div><Target size={20} aria-hidden="true" /></div>
            {rows.length ? <div className="px-goal-preview-list">{rows.slice(0, 3).map(row => <div key={row.id}><strong>{row.label}</strong><span>{row.metric ? formatBodyValue(row.current, row.metric.unit, user) : row.raw?.current || '—'}<ArrowRight size={13} aria-hidden="true" /><b>{row.metric ? formatBodyValue(row.goal, row.metric.unit, user) : row.raw?.target || '—'}</b></span></div>)}</div> : <div className="px-quiet-empty"><Target size={26} /><strong>Make your next step clear</strong><p>Set a measurement goal to start a comparison.</p></div>}
            <Button variant="ghost" onClick={() => selectView('targets')} icon={<ArrowRight size={16} />}>{rows.length ? 'View all targets' : 'Set your first target'}</Button>
          </section>
          <section className="px-card px-zone-panel"><div className="px-section-heading"><div><span className="px-eyebrow">Your training focus</span><h2>Body zones</h2></div></div>
            {zones.length ? <div className="px-zone-list">{zones.map((zone, index) => <div className="px-zone-row" key={zone.name || index}><span className="px-zone-icon" aria-hidden="true">{zone.icon || <Activity size={17} />}</span><SelectField label={zone.name || 'Body zone'} value={zone.status || ''} onChange={event => setZonePhase(index, event.target.value)} disabled={savingZone !== null} options={[...(!PHASES.includes(zone.status) ? [{ value: zone.status || '', label: zone.status || 'Choose a phase' }] : []), ...PHASES.map(value => ({ value, label: value }))]} /><span className="px-zone-status">{savingZone === index ? 'Saving…' : 'Saved focus'}</span></div>)}</div> : <p className="px-muted">No training zones saved yet. You can still record measurements and choose your goals.</p>}
          </section>
        </div>
      </div>
      <div className="px-next-check-in"><span className="px-feature-icon"><CalendarDays size={21} /></span><div><h2>A little consistency tells a bigger story.</h2><p>Save a check-in whenever you measure. Your history keeps each snapshot together.</p></div><Button variant="secondary" onClick={openMeasurements}>Record a check-in <ArrowRight size={15} /></Button></div>
    </section>

    <section hidden={view !== 'measurements'} id="physique-panel-measurements" role="tabpanel" aria-labelledby="physique-tab-measurements" tabIndex={0} className="px-panel">
      {(view === 'measurements' || visitedViews.has('measurements')) && <Suspense fallback={<PanelLoading />}><MeasurementWorkbench current={current} user={user} onSaveProfile={saveProfile} onSaveSnapshot={saveSnapshot} onInspect={region => {
        use3DStore.getState().setAvatarWorkspace({ workspaceMode: 'current' });
        use3DStore.getState().setViewMode('SOLO'); use3DStore.getState().setFocusedBodyPart(region === 'body' ? null : region); selectView('3d');
      }} /></Suspense>}
    </section>
    <section hidden={view !== '3d'} id="physique-panel-3d" role="tabpanel" aria-labelledby="physique-tab-3d" tabIndex={0} className="px-panel px-mirror-panel">
      {view === '3d' && <Suspense fallback={<div className="px-card px-mirror-loading" role="status"><Box size={32} /><h2>Preparing your 3D Mirror</h2><p>Your measurements are getting a new perspective.</p></div>}><ScrollShowcase /></Suspense>}
    </section>
    <section hidden={view !== 'targets'} id="physique-panel-targets" role="tabpanel" aria-labelledby="physique-tab-targets" tabIndex={0} className="px-panel">
      {(view === 'targets' || visitedViews.has('targets')) && <Suspense fallback={<PanelLoading />}><TargetWorkbench current={current} goals={goals} saved={saved} baseline={history[0]?.metrics || EMPTY_OBJECT} user={user} onSaveProfile={saveProfile} onSaveTargets={saveTargets} onMeasurements={openMeasurements} /></Suspense>}
    </section>
    <section hidden={view !== 'history'} id="physique-panel-history" role="tabpanel" aria-labelledby="physique-tab-history" tabIndex={0} className="px-panel">
      {(view === 'history' || visitedViews.has('history')) && <Suspense fallback={<PanelLoading />}><PhysiqueHistory history={history} user={user} onCheckIn={openMeasurements} /></Suspense>}
    </section>
  </div>;
}

function BodyGuide() {
  return <svg className="px-body-illustration" viewBox="0 0 260 330" fill="none" aria-hidden="true">
    <ellipse cx="130" cy="308" rx="66" ry="9" className="px-body-ground" />
    <path d="M130 25c-12 0-19 8-19 21 0 14 8 23 19 23s19-9 19-23c0-13-7-21-19-21Zm-14 49-25 10c-8 4-11 13-15 25l-19 67c-2 9 9 13 13 4l27-57 5 56-12 115c-1 12 14 14 17 3l22-94 22 94c3 11 18 9 17-3l-12-115 5-56 27 57c4 9 15 5 13-4l-19-67c-4-12-7-21-15-25l-25-10-8 7h-10l-8-7Z" className="px-body-silhouette" />
    <path d="M101 110q29 11 58 0M104 152q25 12 50 0M100 181q30 14 59 0M130 82v107M107 188l22 13 22-13" className="px-body-contour" />
    <path d="M32 30v268m-5-268h10m-10 268h10M75 110h110M82 155h96M78 184h104" className="px-body-measure-line" />
    <circle cx="185" cy="110" r="4" className="px-body-point" /><circle cx="82" cy="155" r="4" className="px-body-point" /><circle cx="182" cy="184" r="4" className="px-body-point" />
  </svg>;
}
