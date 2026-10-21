import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Circle, Flag, Pencil, Plus, Target, X } from 'lucide-react';
import Button from '../ui/Button';
import TextField from '../ui/TextField';
import SelectField from '../ui/SelectField';
import EmptyState from '../ui/EmptyState';
import { BODY_METRICS, calculateGoalProgress, metricsToBodyProfile } from '../../lib/physiqueProfile';
import { validateBodyMetric } from '../../lib/bodyMetricContract';
import { convertMeasurementToMetric, formatDate, getMeasurementUnit } from '../../utils/userFormatters';
import { formatBodyValue, inputBodyValue, parseTargetValue, targetRows } from './physiqueWorkspace';

const GOAL_METRICS = BODY_METRICS.filter(metric => metric.targetField);

export default function TargetWorkbench({ current, goals, saved = {}, baseline, user, onSaveProfile, onSaveTargets, onMeasurements }) {
  const rows = useMemo(() => targetRows(saved.targets, current, goals), [saved.targets, current, goals]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newMetric, setNewMetric] = useState('weight');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');
  const milestones = Array.isArray(saved.milestones) ? saved.milestones : [];
  const activeMetric = GOAL_METRICS.find(metric => metric.key === newMetric);

  const commit = async (row, rawValue, isNew = false) => {
    const metric = row.metric;
    const value = rawValue.trim() === '' ? null : metric ? convertMeasurementToMetric(rawValue, metric.unit, user) : parseTargetValue(rawValue);
    if (metric ? !validateBodyMetric(metric.key, value, { allowEmpty: false }).valid : !(value > 0)) {
      setError(`Enter a valid ${metric ? metric.label.toLowerCase() : 'target'}${metric ? ` in ${getMeasurementUnit(metric.unit, user)}` : ''}.`);
      return;
    }
    setSaving(true); setError(''); setFeedback(null);
    try {
      if (metric?.targetField) await onSaveProfile(metricsToBodyProfile({}, { [metric.key]: value }));
      else {
        const targets = [...(saved.targets || [])];
        targets[row.legacyIndex] = { ...targets[row.legacyIndex], target: rawValue };
        await onSaveTargets({ ...saved, targets, ...(metric ? { goalMetrics: { ...saved.goalMetrics, [metric.key]: value } } : {}) });
      }
      setEditing(null);
      if (isNew) { setAdding(false); setNewValue(''); }
      setFeedback({ type: 'success', text: `${row.label} target saved.` });
    } catch { setFeedback({ type: 'error', text: 'The target could not be saved. Your changes are still here; try again.' }); }
    finally { setSaving(false); }
  };
  const toggleMilestone = async milestone => {
    setSaving(true); setFeedback(null);
    try {
      const updated = milestones.map(item => item === milestone ? { ...item, achieved: !item.achieved } : item);
      await onSaveTargets({ ...saved, milestones: updated });
      setFeedback({ type: 'success', text: milestone.achieved ? 'Milestone reopened.' : 'Milestone completed.' });
    } catch { setFeedback({ type: 'error', text: 'The milestone could not be updated. Please retry.' }); }
    finally { setSaving(false); }
  };

  return <div className="px-target-layout">
    <section className="px-card px-targets">
      <div className="px-section-heading"><div><span className="px-eyebrow">Small steps, a clear direction</span><h2>Your measurement goals</h2><p>Choose your own targets and compare them with your recorded measurements.</p></div><Button variant="secondary" disabled={saving} onClick={() => { setAdding(!adding); setEditing(null); setError(''); }} icon={adding ? <X size={16} /> : <Plus size={16} />}>{adding ? 'Close' : 'Add target'}</Button></div>
      {adding && <form className="px-new-target" onSubmit={event => { event.preventDefault(); commit({ metric: activeMetric, label: activeMetric.label }, newValue, true); }} noValidate>
        <SelectField label="Measurement" value={newMetric} disabled={saving} onChange={event => { setNewMetric(event.target.value); setError(''); }} options={GOAL_METRICS.map(metric => ({ value: metric.key, label: metric.label }))} />
        <TextField label={`New goal (${getMeasurementUnit(activeMetric.unit, user)})`} type="number" step="any" inputMode="decimal" placeholder="Enter your goal" value={newValue} onChange={event => { setNewValue(event.target.value); setError(''); }} error={error} disabled={saving} />
        <Button type="submit" loading={saving} loadingLabel="Saving…">Save target</Button>
      </form>}
      {!rows.length && !adding ? <EmptyState icon={Target} title="What would you like to work toward?" description="Add a measurement goal. Your recorded check-ins will show how things change along the way." actionLabel="Set your first target" onAction={() => setAdding(true)} /> : <div className="px-target-list">
        {rows.map(row => {
          const progress = row.metric ? calculateGoalProgress({ baseline, current, goal: { [row.metric.key]: row.goal } }).byMetric[row.metric.key] : null;
          return <article className="px-target-row" key={row.id}>
            <div className="px-target-row__heading"><span className="px-small-icon"><Target size={18} /></span><div><h3>{row.label}</h3><span>{progress == null ? 'Record a baseline to track progress' : `${Math.round(progress)}% of your recorded change toward this goal`}</span></div><Button variant="ghost" className="px-icon-button" aria-label={`Edit ${row.label} target`} disabled={saving} onClick={() => { setEditing(row.id); setDraft(row.metric ? inputBodyValue(row.goal, row.metric.unit, user) : String(row.raw?.target || '')); setAdding(false); setError(''); }} icon={<Pencil size={16} />} /></div>
            {editing === row.id ? <form className="px-target-editor" onSubmit={event => { event.preventDefault(); commit(row, draft); }} noValidate><TextField label={`${row.label} goal${row.metric ? ` (${getMeasurementUnit(row.metric.unit, user)})` : ''}`} type={row.metric ? 'number' : 'text'} step="any" inputMode="decimal" value={draft} onChange={event => { setDraft(event.target.value); setError(''); }} error={error} disabled={saving} autoFocus /><div className="px-action-row"><Button variant="ghost" disabled={saving} onClick={() => { setEditing(null); setError(''); }}>Cancel</Button><Button type="submit" loading={saving} loadingLabel="Saving…">Save target</Button></div></form> : <div className="px-target-values"><div><span>Current</span><strong>{row.metric ? formatBodyValue(row.current, row.metric.unit, user) : row.raw?.current || '—'}</strong></div><ArrowRight size={18} aria-hidden="true" /><div><span>Your goal</span><strong>{row.metric ? formatBodyValue(row.goal, row.metric.unit, user) : row.raw?.target || '—'}</strong></div>{row.metric && row.current !== null && row.goal !== null && <div className="px-target-difference"><span>Difference</span><strong>{formatBodyValue(row.goal - row.current, row.metric.unit, user, true)}</strong></div>}</div>}
            {progress != null && <progress className="px-progress" max="100" value={progress} aria-label={`${row.label} goal progress`}>{Math.round(progress)}%</progress>}
          </article>;
        })}
      </div>}
      <div className="px-target-footnote"><RulerLink onClick={onMeasurements} /><span>Current values use your saved profile when available.</span></div>
      {feedback && <p className={`px-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.type === 'success' && <Check size={16} />}{feedback.text}</p>}
    </section>
    <section className="px-card px-milestones"><div className="px-section-heading"><div><span className="px-eyebrow">One step at a time</span><h2><Flag size={19} /> Milestones</h2></div><span className="px-unit-badge">{milestones.filter(milestone => milestone.achieved).length} / {milestones.length} complete</span></div>
      {milestones.length ? <ol className="px-milestone-list">{milestones.map((milestone, index) => <li key={milestone.id || index}><button type="button" disabled={saving} className={milestone.achieved ? 'is-complete' : ''} aria-label={`${milestone.achieved ? 'Reopen' : 'Complete'} ${milestone.label}`} onClick={() => toggleMilestone(milestone)}>{milestone.achieved ? <CheckCircle2 size={21} /> : <Circle size={21} />}</button><div><strong>{milestone.label}</strong><span>{milestone.targetDate ? formatDate(milestone.targetDate, user) : milestone.month || 'No date set'}</span></div></li>)}</ol> : <div className="px-quiet-empty"><Flag size={25} /><strong>No milestones saved yet</strong><p>Your measurement goals are a good place to start.</p></div>}
    </section>
  </div>;
}

function RulerLink({ onClick }) { return <button type="button" onClick={onClick}>Update current measurements <ArrowRight size={14} /></button>; }
