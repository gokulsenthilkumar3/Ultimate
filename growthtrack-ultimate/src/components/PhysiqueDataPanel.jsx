import React, { useId, useMemo, useState } from 'react';
import { Activity, CheckCircle2, ChevronDown, Cpu, Flag, LockKeyhole, Plus, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import useStore from '../store/useStore';
import { formatDate } from '../utils/userFormatters';
import { BODY_METRIC_GROUPS, BODY_METRICS } from '../lib/physiqueProfile';
import { resolveBodyMetrics } from '../lib/bodyMetricFallbacks';
import { finiteMetric } from '../lib/metricSeries';
import { formatBodyValue } from './physique/physiqueWorkspace';
import Tabs from './ui/Tabs';
import Button from './ui/Button';

const TABS = [
  { value: 'summary', label: 'Summary' },
  { value: 'measurements', label: 'Measurements' },
  { value: 'journey', label: 'Journey' },
  { value: 'model', label: 'Model' },
];

const format = formatBodyValue;

export default function PhysiqueDataPanel({ current = {}, goal = {}, baseline = {}, snapshots = [], milestones = [], progress = {}, diagnostics, onSaveSnapshot, onToggleMilestone }) {
  const user = useStore(state => state.user);
  const [tab, setTab] = useState('summary');
  const [changedOnly, setChangedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [privateOpen, setPrivateOpen] = useState(false);
  const [snapshotPage, setSnapshotPage] = useState(1);
  const id = useId();
  const tabs = TABS.map(item => ({ ...item, panelId: `${id}-panel-${item.value}` }));
  const panelProps = value => ({ id: `${id}-panel-${value}`, role: 'tabpanel', 'aria-labelledby': `${id}-tab-${value}`, hidden: tab !== value, tabIndex: 0 });
  const snapshotPageSize = 25;
  const currentResolution = useMemo(() => resolveBodyMetrics(current), [current]);

  const changed = useMemo(() => BODY_METRICS.filter((metric) => {
    const now = finiteMetric(current[metric.key]);
    const target = finiteMetric(goal[metric.key]);
    return now !== null && target !== null && Math.abs(target - now) > 0.05;
  }), [current, goal]);
  const groups = BODY_METRIC_GROUPS.map(group => ({ ...group, metrics: group.metrics.filter(metric => (!query || metric.label.toLowerCase().includes(query.trim().toLowerCase())) && (!changedOnly || changed.some(item => item.key === metric.key))) })).filter(group => group.metrics.length);
  const shownPage = Math.min(snapshotPage, Math.max(1, Math.ceil(snapshots.length / snapshotPageSize)));

  const recentDate = snapshots.length ? new Date(snapshots[snapshots.length - 1].date) : null;
  const nextMilestone = milestones.find((milestone) => !milestone.achieved);

  return (
    <section className="physique-data" aria-label="Physique data and progress">
      <Tabs className="physique-data__tabs" label="Physique details" idPrefix={`${id}-tab`} tabs={tabs} value={tab} onChange={setTab} />

        <div {...panelProps('summary')} className="physique-summary">
          <article className="physique-score-card">
            <span className="physique-data__eyebrow">Goal progress</span>
            <strong>{progress.score == null ? '—' : `${progress.score}%`}</strong>
            <p>{progress.total ? `${progress.completed} of ${progress.total} tracked measurements reached` : 'Add a baseline and goal to calculate progress.'}</p>
          </article>
          <article className="physique-summary-card"><TrendingUp size={18} /><span>Tracked changes</span><strong>{changed.length}</strong><p>Measurements with a current and goal value.</p></article>
            <article className="physique-summary-card"><Activity size={18} /><span>Latest check-in</span><strong>{recentDate && !Number.isNaN(recentDate.getTime()) ? formatDate(recentDate, user, { month: 'short' }) : 'Not logged'}</strong><p>{snapshots.length ? `${snapshots.length} saved snapshot${snapshots.length === 1 ? '' : 's'}` : 'Save a snapshot to begin the journey.'}</p></article>
          <article className="physique-summary-card"><Target size={18} /><span>Next milestone</span><strong>{nextMilestone?.label || 'Not set'}</strong><p>{nextMilestone?.month || 'Create milestones in Physique Targets.'}</p></article>
          <div className="physique-summary__action"><Button onClick={onSaveSnapshot} icon={<Plus size={15} />}>Save today’s snapshot</Button></div>
        </div>

        <div {...panelProps('measurements')} className="physique-measurements">
          <div className="physique-data__toolbar">
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search measurements" aria-label="Search measurements" />
            <label><input type="checkbox" checked={changedOnly} onChange={(event) => setChangedOnly(event.target.checked)} /> With a different goal</label>
          </div>
          {!groups.length && <div className="physique-empty"><strong>No matching measurements</strong><p>Try another name or turn off the goal filter.</p></div>}
          {groups.map(({ metrics, ...group }) => {
            return <section className="physique-metric-group" key={group.id}><h4>{group.label}<span>{metrics.length}</span></h4><div className="physique-metric-table" role="table" aria-label={`${group.label} measurements`}>
              <div className="physique-metric-table__head" role="row"><span role="columnheader">Measurement</span><span role="columnheader">Baseline</span><span role="columnheader">Current</span><span role="columnheader">Goal</span><span role="columnheader">Change</span></div>
              {metrics.map((metric) => {
                const start = finiteMetric(baseline[metric.key]); const now = finiteMetric(current[metric.key]); const target = finiteMetric(goal[metric.key]);
                const delta = now !== null && target !== null ? target - now : null;
                return <div className="physique-metric-table__row" role="row" key={metric.key}>
                  <strong role="rowheader">{metric.label}</strong><span role="cell" data-label="Baseline">{format(start, metric.unit, user)}</span>
                  <span role="cell" data-label="Current">{format(now, metric.unit, user)} {now !== null && <small>{currentResolution.suppliedKeys.includes(metric.key) ? 'Entered' : 'Estimated'}</small>}</span>
                  <span role="cell" data-label="Goal">{format(target, metric.unit, user)}</span>
                  <span role="cell" data-label="Change" className={delta == null ? '' : 'has-value'}>{delta == null ? '—' : format(delta, metric.unit, user, true)}</span>
                </div>;
              })}
            </div></section>;
          })}
          <details className="physique-private" open={privateOpen} onToggle={(event) => setPrivateOpen(event.currentTarget.open)}>
            <summary><span><LockKeyhole size={15} /> Private measurements</span><ChevronDown size={15} /></summary>
            <div><ShieldCheck size={18} /><p>Private measurements are hidden from the 3D preview, screenshots and sharing. No placeholder values are shown.</p></div>
          </details>
        </div>

        <div {...panelProps('journey')} className="physique-journey">
          {milestones.length ? <ol>{milestones.map((milestone, index) => <li key={milestone.id || index} className={milestone.achieved ? 'achieved' : ''}>
            <button onClick={() => onToggleMilestone?.(milestone)} aria-label={`${milestone.achieved ? 'Reopen' : 'Complete'} ${milestone.label}`}><CheckCircle2 size={18} /></button>
            <div><span>{milestone.month || milestone.targetDate || `Step ${index + 1}`}</span><strong>{milestone.label}</strong></div>
          </li>)}</ol> : <div className="physique-empty"><Flag size={24} /><strong>No journey milestones yet</strong><p>Add milestones in the Targets tab. They will appear here automatically.</p></div>}
          <div className="physique-snapshots"><h4>Saved snapshots</h4>{snapshots.length ? <>{snapshots.slice().reverse().slice((shownPage - 1) * snapshotPageSize, shownPage * snapshotPageSize).map((snapshot) => <div key={snapshot.id}><strong>{formatDate(snapshot.date, user)}</strong><span>{Object.keys(snapshot.metrics || {}).length} measurements</span></div>)}<nav className="physique-pagination" aria-label="Snapshot pages"><Button variant="ghost" disabled={shownPage === 1} onClick={() => setSnapshotPage(shownPage - 1)}>Previous</Button><span>Page {shownPage} of {Math.ceil(snapshots.length / snapshotPageSize)}</span><Button variant="ghost" disabled={shownPage >= Math.ceil(snapshots.length / snapshotPageSize)} onClick={() => setSnapshotPage(shownPage + 1)}>Next</Button></nav></> : <p>No snapshots have been logged.</p>}</div>
        </div>

        <div {...panelProps('model')} className="physique-model-info">
          <article><Cpu size={20} /><div><strong>About your 3D preview</strong><p>The mirror illustrates your measurements and goals. Details without a recorded measurement may be estimated. Use Measurements and History to review your recorded values.</p></div></article>
          {diagnostics ? <details><summary>Technical details</summary><dl><div><dt>Version</dt><dd>{diagnostics.modelAsset?.version || 'legacy'}</dd></div><div><dt>Status</dt><dd>{diagnostics.v2?.ready ? 'v2 ready' : diagnostics.health || 'Unavailable'}</dd></div><div><dt>Vertices</dt><dd>{diagnostics.vertexCount ?? '—'}</dd></div><div><dt>Morph targets</dt><dd>{diagnostics.morphTargetCount ?? '—'}</dd></div><div><dt>Bones</dt><dd>{diagnostics.boneCount ?? '—'}</dd></div><div><dt>Missing v2 parts</dt><dd>{diagnostics.v2?.missingParts?.length ?? '—'}</dd></div></dl></details> : <p className="px-muted">Model details will be available when the preview is ready.</p>}
        </div>
    </section>
  );
}
