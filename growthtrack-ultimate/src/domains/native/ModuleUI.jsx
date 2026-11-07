import React, { useId, useMemo, useRef } from 'react';
import usePageEntrance from '../../hooks/usePageEntrance';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import Tabs from '../../components/ui/Tabs';
import DataTable from '../../components/ui/DataTable';
import CharacterScene, { MotionToggle } from '../../components/motion/CharacterScene';
import { useKinetic } from '../../components/motion/KineticContext';
import usePlayfulMotion from '../../hooks/usePlayfulMotion';
import './native-modules.css';
import { number, dateLabel } from './format';

export function ModuleFrame({ domain, title, subtitle, kind, view, tabs, onViewChange, children, actions, artwork = null, compact = false, context = null }) {
  const ref = useRef(null), id = useId();
  const { canAnimate } = usePlayfulMotion();
  const { enabled } = useKinetic();
  usePageEntrance(ref, view);
  return <section ref={ref} className={`module-page native-module native-module--${domain}${compact ? ' native-module--compact' : ''}`} data-insight-view={domain === 'forex' ? view : undefined} data-motion={String(canAnimate)} data-playful-motion={String(canAnimate)}>
    {compact ? <header className="family-page-heading"><div><span className="native-eyebrow">Life</span><h1>{title}</h1></div><div className="native-actions">{actions}</div></header> : <PageHeader accent={domain === 'family' ? 'Life · Family Connect' : domain === 'equity' ? 'Finance · NiftyLens' : 'Finance · Forex'} title={title} subtitle={subtitle} actions={<div className="native-actions">{artwork}{actions}{!enabled && <MotionToggle compact />}</div>} />}
    {!compact && <div className="native-hero" data-native-enter>
      <div><span className="native-eyebrow">{domain === 'family' ? 'A little closer, every day' : domain === 'equity' ? 'A clearer view of the market' : 'Follow the signal'}</span><h2>{domain === 'family' ? 'Your people. Your story.' : domain === 'equity' ? 'Less noise. More perspective.' : 'Make room for a wider view.'}</h2><p>{domain === 'family' ? 'Keep generations, milestones and memories together.' : domain === 'equity' ? 'Explore your market snapshot, one thoughtful detail at a time.' : 'Explore saved models and currency history in your workspace.'}</p><span className="native-hero__stamp">{domain === 'family' ? 'GROW TOGETHER' : domain === 'equity' ? 'STAY CURIOUS' : 'LOOK A LITTLE CLOSER'} <span aria-hidden="true">↗</span></span></div>
      <div className="native-hero__art"><span className="native-hero__orbit" /><span className="native-hero__spark" aria-hidden="true">✳</span><CharacterScene kind={kind} /></div>
    </div>}
    {context}
    <Tabs label={`${title} views`} idPrefix={id} tabs={tabs.map(tab => ({ ...tab, panelId: `${id}-panel` }))} value={view} onChange={onViewChange} />
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${view}`} className="native-content">{children}</div>
  </section>;
}

export function Metric({ label, value, detail, tone = '' }) {
  return <div className={`native-metric ${tone}`} data-native-enter><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
export function Card({ title, description, actions, children, className = '' }) {
  return <section className={`native-card ${className}`} data-native-enter><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</header>{children}</section>;
}
export function Field({ label, children, hint }) {
  return <label className="native-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function RefreshButton({ query, label = 'Refresh' }) {
  return <button type="button" className="native-button native-button--quiet" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={16} aria-hidden="true" />{query.isFetching ? 'Refreshing…' : label}</button>;
}
export function QueryMessage({ query, title }) {
  if (!query.isError) return null;
  const status = query.error?.status;
  const state = status === 403 ? 'denied' : query.error?.payload?.code === 'MARKET_FEED_NOT_CONFIGURED' ? 'setup' : status === 401 ? 'unauthorized' : 'unavailable';
  return <PageState state={state} title={title} description={query.error?.payload?.error || query.error?.message} onRetry={() => query.refetch()} />;
}
export function ModuleSkeleton({ label = 'Loading records' }) {
  return <div className="native-skeleton" role="status" aria-label={label}><span className="gt-foundation-sr-only">{label}</span><div className="native-metrics" aria-hidden="true">{[0, 1, 2].map(key => <span key={key} />)}</div><div className="native-skeleton__body" aria-hidden="true">{[0, 1, 2, 3].map(key => <span key={key} />)}</div></div>;
}
export function Pagination({ total, page, onPage, size = 25 }) {
  const pages = Math.max(1, Math.ceil(total / size)), current = Math.min(page, pages - 1);
  return <div className="native-pagination"><span>{total ? `${current * size + 1}–${Math.min(total, (current + 1) * size)} of ${number(total, 0)}` : '0 records'}</span><button type="button" className="native-button native-button--quiet" disabled={current === 0} onClick={() => onPage(current - 1)} aria-label="Previous page"><ArrowLeft size={16} /></button><span>Page {current + 1} of {pages}</span><button type="button" className="native-button native-button--quiet" disabled={current + 1 >= pages} onClick={() => onPage(current + 1)} aria-label="Next page"><ArrowRight size={16} /></button></div>;
}
export function NativeTable({ caption, columns, rows, rowKey = 'id' }) {
  return <DataTable caption={caption} columns={columns.map(col => ({ ...col, accessor: row => row[col.id] }))} rows={rows} rowKey={row => String(typeof rowKey === 'function' ? rowKey(row) : row[rowKey])} />;
}

/** Each caller bounds the data before render; gaps remain gaps, never fictional interpolated observations. */
export function LineChart({ series, label, suffix = '' }) {
  const id = useId();
  const chart = useMemo(() => {
    const dates = [...new Set(series.flatMap(item => item.points.map(point => point.date)))].sort();
    const values = series.flatMap(item => item.points.map(point => point.value)).filter(Number.isFinite);
    if (!dates.length || !values.length) return null;
    const low = Math.min(...values), high = Math.max(...values), pad = (high - low || Math.abs(high) * 0.01 || 1) * 0.12;
    const min = low - pad, max = high + pad;
    const dateMin = Date.parse(dates[0]), dateRange = Date.parse(dates.at(-1)) - dateMin || 1;
    const x = date => 66 + (Date.parse(date) - dateMin) / dateRange * 814;
    const y = value => 230 - (value - min) / (max - min) * 202;
    return { dates, min, max, x, y };
  }, [series]);
  if (!chart) return <PageState state="empty" title="No chart points in this window" description="Choose another currency or period." />;
  return <figure className="native-chart"><svg viewBox="0 0 920 280" role="img" aria-labelledby={id}><title id={id}>{label}. {dateLabel(chart.dates[0])} to {dateLabel(chart.dates.at(-1))}. The data table contains the plotted values.</title>{[0, 1, 2, 3, 4].map(index => { const value = chart.min + (chart.max - chart.min) * index / 4; return <g key={index}><line x1="66" x2="880" y1={chart.y(value)} y2={chart.y(value)} className="native-chart__grid" /><text x="56" y={chart.y(value) + 4} textAnchor="end">{number(value)}{suffix}</text></g>; })}{series.map(item => { let gap = true; const d = item.points.map(point => { if (!Number.isFinite(point.value)) { gap = true; return ''; } const command = `${gap ? 'M' : 'L'}${chart.x(point.date)},${chart.y(point.value)}`; gap = false; return command; }).join(' '); return <path key={item.label} d={d} fill="none" stroke={item.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={item.dashed ? '6 6' : undefined} vectorEffect="non-scaling-stroke" />; })}<text x="66" y="262">{dateLabel(chart.dates[0])}</text><text x="880" y="262" textAnchor="end">{dateLabel(chart.dates.at(-1))}</text></svg><figcaption>{series.map(item => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</figcaption></figure>;
}
