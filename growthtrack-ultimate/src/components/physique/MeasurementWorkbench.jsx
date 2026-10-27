import React, { useMemo, useState, useRef } from 'react';
import { Check, CheckCircle2, CircleHelp, Ruler, Save, Search, Sparkles, Undo2 } from 'lucide-react';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import SelectField from '../ui/SelectField';
import { BODY_METRIC_GROUPS, BODY_METRICS, metricsToBodyProfile } from '../../lib/physiqueProfile';
import { parseMetricEntry, stepMetricEntry } from '../../lib/measurementEntry';
import { finiteMetric, localDateKey } from '../../lib/metricSeries';
import { getMeasurementUnit } from '../../utils/userFormatters';
import { formatBodyValue, inputBodyValue, navyBodyFat } from './physiqueWorkspace';
import MeasurementHelp from './MeasurementHelp';
import { getBodyMeasurementDefinition } from '../../lib/bodyMeasurementDefinitions';

const ESSENTIALS = ['height', 'weight', 'bodyFat', 'waist', 'neck', 'hips'];
const GROUPS = [
  { id: 'essentials', label: 'Your essential measurements', metrics: ESSENTIALS.map(key => BODY_METRICS.find(metric => metric.key === key)) },
  ...BODY_METRIC_GROUPS.map(group => ({ ...group, metrics: group.metrics.filter(metric => !ESSENTIALS.includes(metric.key)) })).filter(group => group.metrics.length),
];

export default function MeasurementWorkbench({ current, user, onSaveProfile, onSaveSnapshot, onInspect }) {
  const [draft, setDraft] = useState({});
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('essentials');
  const [saving, setSaving] = useState(false);
  const [activeMeasurement, setActiveMeasurement] = useState('height');
  const helpRef = useRef(null);
  const [feedback, setFeedback] = useState(null);
  const [formula, setFormula] = useState(String(user?.gender).toUpperCase().startsWith('F') ? 'F' : 'M');
  const dirty = Object.keys(draft).length > 0;
  const valueFor = metric => draft[metric.key] ?? inputBodyValue(current[metric.key], metric.unit, user);
  const metricFor = key => {
    const metric = BODY_METRICS.find(item => item.key === key);
    const value = valueFor(metric);
    const parsed = parseMetricEntry(key, value, getMeasurementUnit(metric.unit, user));
    return parsed.valid ? parsed.value : null;
  };
  const calculation = navyBodyFat({ sex: formula, height: metricFor('height'), neck: metricFor('neck'), waist: metricFor('waist'), hips: metricFor('hips') });
  const required = formula === 'F' ? ['height', 'neck', 'waist', 'hips'] : ['height', 'neck', 'waist'];
  const filteredGroups = useMemo(() => GROUPS.filter(group => query.trim() || region === 'all' || group.id === region).map(group => ({ ...group, metrics: group.metrics.filter(metric => metric.label.toLowerCase().includes(query.trim().toLowerCase())) })).filter(group => group.metrics.length), [query, region]);

  const change = (key, value) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setFeedback(null);
  };
  const save = async event => {
    event.preventDefault();
    const patch = {};
    const invalid = {};
    for (const [key, value] of Object.entries(draft)) {
      const metric = BODY_METRICS.find(item => item.key === key);
      const result = parseMetricEntry(key, value, getMeasurementUnit(metric.unit, user));
      if (!result.valid) invalid[key] = result.reason;
      else patch[key] = result.value;
    }
    if (Object.keys(invalid).length) {
      setErrors(invalid);
      setQuery('');
      setRegion('all');
      setFeedback({ type: 'error', text: 'Review the highlighted measurements before saving.' });
      requestAnimationFrame(() => {
        const input = document.getElementById(`physique-input-${Object.keys(invalid)[0]}`);
        if (input?.closest('details')) input.closest('details').open = true;
        input?.focus();
      });
      return;
    }
    const next = { ...current, ...patch };
    const publicMetrics = Object.fromEntries(BODY_METRICS.flatMap(metric => finiteMetric(next[metric.key]) === null ? [] : [[metric.key, Number(next[metric.key])]]));
    if (!Object.keys(publicMetrics).length) { setFeedback({ type: 'error', text: 'Add at least one measurement to record a check-in.' }); return; }
    setSaving(true); setFeedback(null);
    let profileSaved = false;
    try {
      if (Object.keys(patch).length) { await onSaveProfile(metricsToBodyProfile(patch)); profileSaved = true; setDraft({}); }
      await onSaveSnapshot({ date: localDateKey(), metric: 'physique_snapshot', source: 'physique', metrics: publicMetrics, label: 'Physique check-in' });
      setFeedback({ type: 'success', text: 'Check-in saved. Your measurements and history are up to date.' });
    } catch {
      setFeedback({ type: 'error', text: profileSaved ? 'Measurements saved, but the history snapshot failed. Save again to retry the snapshot.' : 'Your check-in could not be saved. Your changes are still here; please retry.' });
    } finally { setSaving(false); }
  };

  return <div className="px-measurement-layout">
    <form onSubmit={save} className="px-card px-measurement-form" noValidate>
      <div className="px-section-heading"><div><span className="px-eyebrow">A moment to check in</span><h2>Measurements</h2><p>Enter what you know. Leave unrecorded measurements empty.</p></div><span className="px-unit-badge">{getMeasurementUnit('cm', user)} / {getMeasurementUnit('kg', user)}</span></div>
      <div className="px-measurement-toolbar">
        <SelectField label="Measurement region" value={region} onChange={event => setRegion(event.target.value)} options={[{ value:'essentials',label:'Essentials' }, ...GROUPS.filter(group => group.id !== 'essentials').map(group => ({ value:group.id,label:group.label })), { value:'all',label:'All measurements' }]} />
        <div className="px-search"><Search size={17} aria-hidden="true" /><TextField type="search" label="Find a measurement" placeholder="Search every region…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      </div>
      <div className="px-measurement-groups">
        {filteredGroups.map(group => {
          const fields = <div className="px-field-grid">{group.metrics.map(metric => <div className="measurement-field-help" key={metric.key}>
            <TextField id={`physique-input-${metric.key}`} label={`${metric.label} (${getMeasurementUnit(metric.unit, user)})`} type="text" inputMode="text" placeholder="Not recorded" value={valueFor(metric)} onFocus={() => setActiveMeasurement(metric.key)} onChange={event => change(metric.key, event.target.value)} error={errors[metric.key]} disabled={saving}
              onKeyDown={event => {
                const next = stepMetricEntry(metric.key, valueFor(metric), getMeasurementUnit(metric.unit, user), event);
                if (next !== null) { event.preventDefault(); change(metric.key, next); }
              }} />
            <button type="button" aria-label={`How to measure ${metric.label}`} aria-pressed={activeMeasurement === metric.key} onClick={() => { setActiveMeasurement(metric.key); requestAnimationFrame(() => helpRef.current?.scrollIntoView({ block: 'nearest' })); }}><CircleHelp size={15}/></button>
          </div>)}</div>;
          return group.id === 'essentials' ? <fieldset key={group.id}><legend>{group.label}</legend>{fields}</fieldset> : <details className="px-measurement-group" key={group.id} open={query ? true : undefined}><summary><span>{group.label}</span><small>{group.metrics.filter(metric => finiteMetric(current[metric.key]) !== null).length} recorded</small></summary>{fields}</details>;
        })}
        {!filteredGroups.length && <p className="px-inline-empty">No measurements match “{query}”. Try another name.</p>}
      </div>
      <div className="px-form-footer">
        <div><span className={`px-save-indicator${dirty ? ' is-dirty' : ''}`}>{dirty ? <><span /> Unsaved changes</> : <><CheckCircle2 size={15} /> Saved profile values</>}</span><p>Saving also adds a snapshot to History.</p></div>
        <div className="px-action-row">{dirty && <Button variant="ghost" disabled={saving} onClick={() => { setDraft({}); setErrors({}); setFeedback(null); }} icon={<Undo2 size={16} />}>Discard changes</Button>}<Button type="submit" loading={saving} loadingLabel="Saving check-in…" icon={<Save size={16} />}>Save check-in</Button></div>
      </div>
      {feedback && <p className={`px-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.type === 'success' && <Check size={16} />}{feedback.text}</p>}
    </form>
    <aside className="px-measurement-aside">
      <div ref={helpRef}><MeasurementHelp key={activeMeasurement} definition={getBodyMeasurementDefinition(activeMeasurement)} label={BODY_METRICS.find(m => m.key === activeMeasurement)?.label || activeMeasurement} onInspect={onInspect} /></div>
      <section className="px-card px-estimator" aria-label="Body fat estimator">
        <span className="px-feature-icon"><Sparkles size={20} /></span>
        <span className="px-eyebrow">An optional perspective</span><h2>Body fat estimate</h2>
        <p>Use your circumference inputs to estimate body composition.</p>
        <SelectField label="Calculation formula" value={formula} onChange={event => setFormula(event.target.value)} options={[{ value: 'M', label: 'Male formula' }, { value: 'F', label: 'Female formula' }]} />
        <div className="px-estimate-value" aria-live="polite"><strong>{calculation === null ? '—' : calculation.toFixed(1)}{calculation !== null && <small>%</small>}</strong><span>{calculation === null ? 'Add the measurements below' : 'Calculated estimate'}</span></div>
        <ul className="px-estimate-checklist">{required.map(key => <li key={key}><span>{Number(metricFor(key)) > 0 ? <CheckCircle2 size={15} /> : <Ruler size={15} />}{BODY_METRICS.find(metric => metric.key === key).label}</span><span>{formatBodyValue(metricFor(key), 'cm', user)}</span></li>)}</ul>
        <Button variant="secondary" disabled={calculation === null || saving} onClick={() => { change('bodyFat', calculation.toFixed(1)); setFeedback({ type: 'info', text: 'Estimate added to your check-in. Save the check-in to record it.' }); }} icon={<Check size={16} />}>Use this estimate</Button>
        <details className="px-estimate-explainer"><summary><CircleHelp size={15} /> About this estimate</summary><p>The U.S. Navy circumference formula uses the inputs shown above. The result is an estimate and is only saved when you choose to use it and save your check-in.</p></details>
      </section>
      <div className="px-measurement-tip"><Ruler size={18} /><div><strong>Keep check-ins consistent</strong><p>Use the same units and measurement points when comparing entries. Your unit preference is applied throughout this page.</p></div></div>
    </aside>
  </div>;
}
