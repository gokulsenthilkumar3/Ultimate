import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, Cpu, Flag, LockKeyhole, Plus, Ruler, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import useStore from '../store/useStore';
import { formatMeasurement, formatDate } from '../utils/userFormatters';
import { BODY_METRIC_GROUPS, BODY_METRICS } from '../lib/physiqueProfile';
import { resolveBodyMetrics } from '../lib/bodyMetricFallbacks';

const TABS = [
  { id: 'summary', label: 'Summary', icon: Activity },
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'journey', label: 'Journey', icon: Flag },
  { id: 'model', label: 'Model', icon: Cpu },
];

const format = (value, unit, user) => {
  if (!Number.isFinite(Number(value))) return '—';
  if (['cm', 'kg', 'in', 'lb', 'g', 'oz'].includes(String(unit).toLowerCase())) return formatMeasurement(value, unit, user, { maximumFractionDigits: 1 });
  return `${Number(value).toFixed(unit === '%' ? 1 : 1)}${unit}`;
};

export default function PhysiqueDataPanel({ current = {}, goal = {}, baseline = {}, snapshots = [], milestones = [], progress, diagnostics, onSaveSnapshot, onToggleMilestone }) {
  const user = useStore(state => state.user);
  const [tab, setTab] = useState('summary');
  const [changedOnly, setChangedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [privateOpen, setPrivateOpen] = useState(false);
  const [snapshotPage, setSnapshotPage] = useState(1);
  const snapshotPageSize = 25;
  const currentResolution = useMemo(() => resolveBodyMetrics(current), [current]);

  const changed = useMemo(() => BODY_METRICS.filter((metric) => {
    const now = Number(current[metric.key]);
    const target = Number(goal[metric.key]);
    return Number.isFinite(now) && Number.isFinite(target) && Math.abs(target - now) > 0.05;
  }), [current, goal]);

  const recentDate = snapshots.length ? new Date(snapshots[snapshots.length - 1].date) : null;
  const nextMilestone = milestones.find((milestone) => !milestone.achieved);

  return (
    <section className="physique-data" aria-label="Physique data and progress">
      <nav className="physique-data__tabs" aria-label="Physique details">
        {TABS.map(({ id, label, icon }) => (
          <button key={id} className={tab === id ? 'active' : ''} aria-selected={tab === id} onClick={() => setTab(id)}>
            {React.createElement(icon, { size: 15, 'aria-hidden': true })}<span>{label}</span>
          </button>
        ))}
      </nav>

      {tab === 'summary' && (
        <div className="physique-summary">
          <article className="physique-score-card">
            <span className="physique-data__eyebrow">Goal progress</span>
            <strong>{progress.score == null ? '—' : `${progress.score}%`}</strong>
            <p>{progress.total ? `${progress.completed} of ${progress.total} tracked measurements reached` : 'Add a baseline and goal to calculate progress.'}</p>
          </article>
          <article className="physique-summary-card"><TrendingUp size={18} /><span>Tracked changes</span><strong>{changed.length}</strong><p>Measurements with a current and goal value.</p></article>
            <article className="physique-summary-card"><Activity size={18} /><span>Latest check-in</span><strong>{recentDate && !Number.isNaN(recentDate.getTime()) ? formatDate(recentDate, user, { month: 'short' }) : 'Not logged'}</strong><p>{snapshots.length ? `${snapshots.length} database snapshot${snapshots.length === 1 ? '' : 's'}` : 'Save a snapshot to begin the journey.'}</p></article>
          <article className="physique-summary-card"><Target size={18} /><span>Next milestone</span><strong>{nextMilestone?.label || 'Not set'}</strong><p>{nextMilestone?.month || 'Create milestones in Physique Targets.'}</p></article>
          <div className="physique-summary__action"><button className="physique-action" onClick={onSaveSnapshot}><Plus size={15} /> Save today’s snapshot</button></div>
        </div>
      )}

      {tab === 'measurements' && (
        <div className="physique-measurements">
          <div className="physique-data__toolbar">
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search measurements" aria-label="Search measurements" />
            <label><input type="checkbox" checked={changedOnly} onChange={(event) => setChangedOnly(event.target.checked)} /> Changed only</label>
          </div>
          {BODY_METRIC_GROUPS.map((group) => {
            const metrics = group.metrics.filter((metric) => (!query || metric.label.toLowerCase().includes(query.toLowerCase())) && (!changedOnly || changed.some((item) => item.key === metric.key)));
            if (!metrics.length) return null;
            return <section className="physique-metric-group" key={group.id}><h4>{group.label}<span>{metrics.length}</span></h4><div className="physique-metric-table">
              <div className="physique-metric-table__head"><span>Measurement</span><span>Baseline</span><span>Current</span><span>Goal</span><span>Change</span></div>
              {metrics.map((metric) => {
                const start = Number(baseline[metric.key]); const now = Number(current[metric.key]); const target = Number(goal[metric.key]);
                const delta = Number.isFinite(now) && Number.isFinite(target) ? target - now : null;
                return <div className="physique-metric-table__row" key={metric.key}>
                  <strong>{metric.label}</strong><span data-label="Baseline">{format(start, metric.unit, user)}</span>
                  <span data-label="Current">{format(now, metric.unit, user)} <small>{currentResolution.suppliedKeys.includes(metric.key) ? 'Entered' : 'Estimated'}</small></span>
                  <span data-label="Goal">{format(target, metric.unit, user)}</span>
                  <span data-label="Change" className={delta == null ? '' : 'has-value'}>{delta == null ? '—' : format(delta, metric.unit, user)}</span>
                </div>;
              })}
            </div></section>;
          })}
          <details className="physique-private" open={privateOpen} onToggle={(event) => setPrivateOpen(event.currentTarget.open)}>
            <summary><span><LockKeyhole size={15} /> Private measurements</span><ChevronDown size={15} /></summary>
            <div><ShieldCheck size={18} /><p>Private measurements are hidden from the 3D preview, screenshots and sharing. No placeholder values are shown.</p></div>
          </details>
        </div>
      )}

      {tab === 'journey' && (
        <div className="physique-journey">
          {milestones.length ? <ol>{milestones.map((milestone, index) => <li key={milestone.id || index} className={milestone.achieved ? 'achieved' : ''}>
            <button onClick={() => onToggleMilestone?.(milestone)} aria-label={`${milestone.achieved ? 'Reopen' : 'Complete'} ${milestone.label}`}><CheckCircle2 size={18} /></button>
            <div><span>{milestone.month || milestone.targetDate || `Step ${index + 1}`}</span><strong>{milestone.label}</strong></div>
          </li>)}</ol> : <div className="physique-empty"><Flag size={24} /><strong>No journey milestones yet</strong><p>Add milestones in the Targets tab. They will appear here automatically.</p></div>}
          <div className="physique-snapshots"><h4>Database snapshots</h4>{snapshots.length ? <>{snapshots.slice().reverse().slice((snapshotPage - 1) * snapshotPageSize, snapshotPage * snapshotPageSize).map((snapshot) => <div key={snapshot.id}><strong>{formatDate(snapshot.date, user)}</strong><span>{Object.keys(snapshot.metrics || {}).length} measurements</span></div>)}<nav className="physique-pagination" aria-label="Snapshot pages"><button disabled={snapshotPage === 1} onClick={() => setSnapshotPage((page) => page - 1)}>Previous</button><span>Page {snapshotPage} of {Math.ceil(snapshots.length / snapshotPageSize)}</span><button disabled={snapshotPage >= Math.ceil(snapshots.length / snapshotPageSize)} onClick={() => setSnapshotPage((page) => page + 1)}>Next</button></nav></> : <p>No snapshots have been logged.</p>}</div>
        </div>
      )}

      {tab === 'model' && (
        <div className="physique-model-info">
          <article><Cpu size={20} /><div><strong>{diagnostics?.modelAsset?.releaseApproved ? 'Release approved' : diagnostics?.modelAsset?.version === 'v2' ? 'Candidate asset' : 'Legacy asset'}</strong><p>Structural loading does not certify realism. This asset remains under review until visual, calibration, licensing, LOD, and performance gates pass.</p></div></article>
          <section className="physique-model-gates"><h4>Open release gates</h4>{['Hair appearance and scalp coverage','Shoulder and upper-arm contours','Eye seating and face proportions','Hand and foot detail','External-anatomy attachment and material continuity','Buttock and pelvis silhouette','Calibrated circumference results','True geometry LOD family','Hair and eye proxy licensing','Performance and matching-view certification'].map((gate) => <div key={gate}><AlertTriangle size={14} /><span>{gate}</span></div>)}</section>
          {diagnostics && <details><summary>Asset diagnostics</summary><dl><div><dt>Version</dt><dd>{diagnostics.modelAsset?.version || 'legacy'}</dd></div><div><dt>Status</dt><dd>{diagnostics.v2?.ready ? 'v2 ready' : diagnostics.health}</dd></div><div><dt>Vertices</dt><dd>{diagnostics.vertexCount || 0}</dd></div><div><dt>Morph targets</dt><dd>{diagnostics.morphTargetCount || 0}</dd></div><div><dt>Bones</dt><dd>{diagnostics.boneCount || 0}</dd></div><div><dt>Missing v2 parts</dt><dd>{diagnostics.v2?.missingParts?.length ?? '—'}</dd></div></dl></details>}
        </div>
      )}
    </section>
  );
}
