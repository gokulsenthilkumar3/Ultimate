import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, History, Minus } from 'lucide-react';
import Button from '../ui/Button';
import SelectField from '../ui/SelectField';
import EmptyState from '../ui/EmptyState';
import { formatDate } from '../../utils/userFormatters';
import { METRIC_BY_KEY, formatBodyValue } from './physiqueWorkspace';

const KEYS = ['weight', 'bodyFat', 'waist', 'chest', 'shoulders', 'arms', 'hips', 'thighs', 'calves'];
const PAGE_SIZE = 8;

export default function PhysiqueHistory({ history, user, onCheckIn }) {
  const [key, setKey] = useState('weight');
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [openedAt] = useState(() => Date.now());
  const metric = METRIC_BY_KEY[key];
  const points = useMemo(() => {
    const cutoff = period === 'all' ? null : new Date(openedAt - Number(period) * 86400000).toISOString().slice(0, 10);
    return history.filter(log => Number.isFinite(log.metrics[key]) && (!cutoff || log.date.slice(0, 10) >= cutoff));
  }, [history, key, period, openedAt]);
  const shownPage = Math.min(page, Math.max(1, Math.ceil(points.length / PAGE_SIZE)));
  const rows = points.slice().reverse().slice((shownPage - 1) * PAGE_SIZE, shownPage * PAGE_SIZE);
  const first = points[0]; const last = points.at(-1);
  const change = points.length > 1 ? last.metrics[key] - first.metrics[key] : null;
  const exportHistory = () => {
    const csv = [['Date', metric.label + ` (${metric.unit})`], ...points.map(log => [log.date.slice(0, 10), log.metrics[key]])].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `physique-${key}-history.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className="px-card px-history">
    <div className="px-section-heading"><div><span className="px-eyebrow">The bigger picture</span><h2>Your body over time</h2><p>Explore your recorded check-ins, one measurement at a time.</p></div><Button variant="secondary" icon={<Download size={16} />} disabled={!points.length} onClick={exportHistory}>Export CSV</Button></div>
    <div className="px-history-filters"><SelectField label="Measurement" value={key} onChange={event => { setKey(event.target.value); setPage(1); }} options={KEYS.map(value => ({ value, label: METRIC_BY_KEY[value].label }))} /><SelectField label="Time range" value={period} onChange={event => { setPeriod(event.target.value); setPage(1); }} options={[{ value: 'all', label: 'All check-ins' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]} /><span className="px-history-count" role="status">{points.length} recorded check-in{points.length === 1 ? '' : 's'}</span></div>
    {!points.length ? <EmptyState icon={History} title={history.length ? 'No entries for this selection' : 'Your story starts with a check-in'} description={history.length ? 'Try a different measurement or a wider time range.' : 'Save your measurements to begin a timeline you can look back on.'} actionLabel="Record a check-in" onAction={onCheckIn} /> : <>
      <div className="px-history-summary"><div><span>Latest {metric.label.toLowerCase()}</span><strong>{formatBodyValue(last.metrics[key], metric.unit, user)}</strong><small>{formatDate(last.date, user)}</small></div><div><span>Change in this period</span><strong>{change === null ? '—' : <>{change > 0 ? <ArrowUp size={20} /> : change < 0 ? <ArrowDown size={20} /> : <Minus size={20} />}{formatBodyValue(Math.abs(change), metric.unit, user)}</>}</strong><small>{change === null ? 'Add another check-in to compare' : `Since ${formatDate(first.date, user)}`}</small></div></div>
      <HistoryChart points={points} metric={metric} user={user} />
      <div className="px-history-table-wrap"><table className="px-history-table"><caption className="sr-only">Recorded {metric.label.toLowerCase()} check-ins, newest first</caption><thead><tr><th scope="col">Date</th><th scope="col">{metric.label}</th><th scope="col">Entry</th></tr></thead><tbody>{rows.map((log, index) => <tr key={log.id || `${log.date}-${index}`}><td>{formatDate(log.date, user)}</td><td>{formatBodyValue(log.metrics[key], metric.unit, user)}</td><td><span className="px-record-tag">{log.metric === 'physique_snapshot' ? 'Snapshot' : 'Check-in'}</span></td></tr>)}</tbody></table></div>
      <nav className="px-pagination" aria-label="Check-in history pages"><span>{points.length ? (shownPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(shownPage * PAGE_SIZE, points.length)} of {points.length}</span><div className="px-action-row"><Button variant="ghost" disabled={shownPage <= 1} onClick={() => setPage(shownPage - 1)}>Previous</Button><Button variant="ghost" disabled={shownPage >= Math.ceil(points.length / PAGE_SIZE)} onClick={() => setPage(shownPage + 1)}>Next</Button></div></nav>
    </>}
  </section>;
}

function HistoryChart({ points, metric, user }) {
  const values = points.map(point => point.metrics[metric.key]);
  const low = Math.min(...values); const high = Math.max(...values); const span = high - low || Math.max(1, Math.abs(high) * .1);
  const firstTime = Date.parse(points[0].date); const timeSpan = Date.parse(points.at(-1).date) - firstTime;
  const coords = values.map((value, index) => [30 + (timeSpan ? (Date.parse(points[index].date) - firstTime) / timeSpan : index / Math.max(1, values.length - 1)) * 700, 155 - (value - low) / span * 115]);
  const line = coords.map(([x, y]) => `${x},${y}`).join(' ');
  return <figure className="px-history-chart"><svg viewBox="0 0 760 190" role="img" aria-label={`${metric.label} across ${points.length} check-ins, from ${formatBodyValue(values[0], metric.unit, user)} to ${formatBodyValue(values.at(-1), metric.unit, user)}`}>
    {[40, 97.5, 155].map(y => <line key={y} x1="30" y1={y} x2="730" y2={y} className="px-chart-grid" />)}
    {coords.length > 1 && <><polygon points={`30,170 ${line} ${coords.at(-1)[0]},170`} className="px-chart-area" /><polyline points={line} className="px-chart-line" /></>}
    {coords.map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r={index === coords.length - 1 ? 5 : 3} className="px-chart-point"><title>{formatDate(points[index].date, user)}: {formatBodyValue(values[index], metric.unit, user)}</title></circle>)}
  </svg><figcaption><span>{formatDate(points[0].date, user)}</span><span>Recorded values · {metric.label.toLowerCase()}</span><span>{formatDate(points.at(-1).date, user)}</span></figcaption></figure>;
}
