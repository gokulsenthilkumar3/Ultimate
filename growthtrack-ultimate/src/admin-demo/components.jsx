import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { chartDates, chartGeometry } from './models/chartModel';
import useScrollLock from './hooks/useScrollLock';
import { ProvenanceChip } from './Scope';
import { TABLE_PAGE_SIZES, tablePage } from './models/tableModel';
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, CreditCard, Download, FileText,
  Folder, Globe2, Heart, LayoutDashboard, Leaf, ListChecks, Menu, Moon, MoreHorizontal,
  Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Sun, TrendingUp,
  Users, Wallet, X, CircleHelp, CircleAlert, PanelLeftClose, CalendarDays,
} from 'lucide-react';

export const icons = {
  overview: LayoutDashboard, wellness: Heart, equity: TrendingUp, forex: Globe2, family: Users,
  customers: Users, finance: Wallet, finsync: Wallet, oxfin: CreditCard, tasks: ListChecks, projects: Folder,
  calendar: CalendarDays, documents: FileText, analytics: Activity, profile: Settings2,
  help: CircleHelp, ai: Sparkles, notes: BookOpen, logs: ShieldCheck,
};
export function Icon({ name, ...props }) { const Component = icons[name] || Leaf; return <Component size={18} strokeWidth={1.65} {...props} />; }
export { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, CreditCard, Download, FileText, Folder, Globe2, Heart, LayoutDashboard, Leaf, ListChecks, Menu, Moon, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Sun, TrendingUp, Users, Wallet, X, CircleHelp, CircleAlert, PanelLeftClose, CalendarDays };

export function Badge({ children, tone = 'neutral' }) { return <span className={`badge badge-${tone}`}><span className="badge-dot" />{children}</span>; }
export function Avatar({ name, initials, color = 'sage', small = false }) { return <span aria-label={name} className={`avatar avatar-${color}${small ? ' avatar-small' : ''}`}>{initials || name?.split(' ').map(s => s[0]).slice(0, 2).join('')}</span>; }
export function Button({ children, icon: Leading, variant = '', className = '', ...props }) { return <button type="button" className={`button ${variant} ${className}`} {...props}>{Leading && <Leading size={15} />}{children}</button>; }
export function IconButton({ label, children, ...props }) { return <button type="button" className="icon-button" aria-label={label} title={label} {...props}>{children}</button>; }
export function Panel({ title, subtitle, action, children, className = '', provenance }) { return <section className={`panel ${className}`}><div className="panel-heading"><div className="panel-title"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><div className="panel-actions"><ProvenanceChip>{provenance}</ProvenanceChip>{action}</div></div>{children}</section>; }
export function Metric({ label, value, delta, detail, icon: MetricIcon = Activity, down = false }) { return <article className="metric"><div className="metric-label">{label}<MetricIcon size={16} /></div><div className="metric-value">{value}</div><div className="metric-detail">{delta && <span className={down ? 'negative' : 'positive'}>{down ? '↘' : '↗'} {delta}</span>}<span>{detail || 'vs. previous period'}</span></div></article>; }
export function Metrics({ items }) { return <div className="metrics">{items.map((item, i) => <Metric key={i} {...item} />)}</div>; }
export function Progress({ value = 65, label, color }) { return <div className="progress-group">{label && <div className="between"><span>{label}</span><span className="muted">{value}%</span></div>}<div className="progress-track" role="progressbar" aria-label={label || 'Progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%`, background: color }} /></div></div>; }

export function LineChart({ range = '30 days', label = 'Sample customer activity', forecast = false, referenceValue }) {
  const id = useId().replace(/:/g, '');
  const { coordinates: coords, ticks, format } = chartGeometry(range, referenceValue);
  const path = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const forecastPoints = coords.slice(-5);
  const band = [...forecastPoints.map(([x, y]) => [x, y - 12]), ...[...forecastPoints].reverse().map(([x, y]) => [x, y + 12])].map(([x, y]) => `${x},${y}`).join(' ');
  return <div className="chart-wrap" role="region" tabIndex={0} aria-label={`${label} chart area`}><svg viewBox="0 0 740 244" role="img" aria-label={label}>
    <title>{label}; fictional data, rising over the selected period</title>
    <defs><linearGradient id={`fill-${id}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="var(--accent)" stopOpacity=".16" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
    {ticks.map(({ y, value }) => <g key={y}><line x1="100" x2="710" y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 5" /><text x="4" y={y + 4} fill="var(--muted)" fontSize="16">{format(value)}</text></g>)}
    <path d={`${path} L700,194 L100,194 Z`} fill={`url(#fill-${id})`} />
    {forecast && <polygon points={band} fill="var(--accent)" opacity=".12" />}
    <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
    {chartDates(range).map(({ iso, label: text }, i) => <text key={iso} x={100 + i * 120} y="230" textAnchor={i === 5 ? 'end' : 'start'} fill="var(--muted)" fontSize="15">{text}</text>)}
    <circle cx={coords.at(-1)[0]} cy={coords.at(-1)[1]} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
  </svg></div>;
}
export function Sparkline({ negative = false }) { return <svg className="sparkline" viewBox="0 0 90 32" role="img" aria-label={negative ? 'Sample downward trend' : 'Sample upward trend'}><path d={negative ? 'M2 5 L15 9 L23 6 L34 16 L43 12 L54 23 L65 18 L76 25 L88 29' : 'M2 26 L14 20 L24 24 L35 12 L45 18 L56 10 L66 14 L77 4 L88 7'} fill="none" stroke={negative ? 'var(--danger)' : 'var(--accent)'} strokeWidth="1.8" /></svg>; }

export function Empty({ title = 'A little space for what comes next', description = 'Your records will appear here. Try the populated preview to explore this layout.', onReset, error = false, loading = false, actionLabel }) {
  return <div className={`empty-state${loading ? ' loading-state' : ''}`} aria-live="polite" aria-busy={loading}><div className="empty-icon">{error ? <CircleAlert /> : loading ? <Activity /> : <Folder />}</div><h2>{loading ? 'Loading your workspace' : title}</h2><p>{loading ? 'Preview of the loading experience.' : description}</p>{loading ? <div className="skeleton-lines" aria-hidden="true"><i /><i /><i /></div> : onReset && <Button variant="primary" onClick={onReset}>{actionLabel || (error ? 'Try again' : 'Show sample records')}</Button>}</div>;
}
export function Modal({ title, children, onClose, wide = false, focusKey }) {
  const ref = useRef(null);
  const opener = useRef(document.activeElement);
  const titleId = useId();
  useScrollLock(true);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); if (opener.current?.isConnected) opener.current.focus(); };
  }, []);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const target = dialog.querySelector('[data-autofocus], [autofocus], input:not([readonly]), textarea') || dialog.querySelector('h2');
    target?.focus();
  }, [focusKey]);
  function dismissBackdrop(event) {
    if (event.target !== ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }
  return <dialog ref={ref} className={`modal${wide ? ' modal-wide' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={dismissBackdrop}><div className="modal-heading"><h2 id={titleId} tabIndex={-1}>{title}</h2><IconButton label="Close dialog" onClick={onClose}><X size={19} /></IconButton></div>{children}</dialog>;
}

export function RecordsTable({ rows, columns, label = 'Records', onRow, searchPlaceholder = 'Search records…', onClearFilters, query: controlledQuery, onQueryChange, filterKey, renderSummary }) {
  const [localQuery, setLocalQuery] = useState('');
  const query = controlledQuery ?? localQuery;
  const [sort, setSort] = useState(null);
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const result = useMemo(() => tablePage(rows, columns, { query, sort, ascending, page, pageSize }), [rows, columns, query, sort, ascending, page, pageSize]);
  useEffect(() => { if (page !== result.page) setPage(result.page); }, [page, result.page]);
  useEffect(() => { setPage(0); }, [filterKey]);
  const search = value => { if (onQueryChange) onQueryChange(value); else setLocalQuery(value); setPage(0); };
  return <>
    <div className="table-toolbar"><label className="search-field"><Search size={16} /><input aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={query} onChange={event => search(event.target.value)} />{query && <IconButton label="Clear table search" onClick={() => search('')}><X size={14} /></IconButton>}</label><span className="muted small" aria-live="polite">{result.total} {result.total === 1 ? 'record' : 'records'}</span></div>
    <div className="table-scroll" tabIndex={0} role="region" aria-label={`${label} table area`}><table aria-label={label}><thead><tr>{columns.map(column => <th key={column.key} className={column.numeric ? 'data-number' : undefined} scope="col" aria-sort={sort === column.key ? ascending ? 'ascending' : 'descending' : undefined}><button onClick={() => { setSort(column.key); setAscending(sort === column.key ? !ascending : true); setPage(0); }}>{column.label}<ChevronDown size={12} style={{ transform: sort === column.key && ascending ? 'rotate(180deg)' : undefined }} /></button></th>)}{onRow && <th scope="col"><span className="sr-only">Details</span></th>}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={row.id || row.name || row.title || `${result.page}-${index}`}>{columns.map(column => <td key={column.key} className={column.numeric || typeof row[column.key] === 'number' ? 'data-number' : undefined}>{column.render ? column.render(row) : row[column.key]}</td>)}{onRow && <td><IconButton label={`Open ${row.name || row.title || row.id}`} onClick={() => onRow(row)}><ArrowUpRight size={16} /></IconButton></td>}</tr>)}</tbody></table>{!result.total && <Empty title={rows.length ? 'No matching records' : 'No records in this view'} description={rows.length ? 'Try a different search or clear the search field.' : 'Choose a different filter to see other sample records.'} onReset={rows.length ? () => search('') : onClearFilters} actionLabel={rows.length ? 'Clear search' : 'Clear filters'} />}</div>
    {renderSummary && <div className="table-summary">{renderSummary(result.matchingRows)}</div>}
    {rows.length > TABLE_PAGE_SIZES[0] && <div className="table-pagination"><label>Rows per page<select aria-label={`Rows per page for ${label}`} value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(0); }}>{TABLE_PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}</select></label><span className="small muted" role="status">{result.start}–{result.end} of {result.total} {result.total === 1 ? 'record' : 'records'}</span><nav aria-label={`${label} pagination`}><Button aria-label={`Previous page of ${label}`} disabled={result.page === 0} onClick={() => setPage(result.page - 1)}>Previous</Button><span className="small">{result.page + 1} / {result.pages}</span><Button aria-label={`Next page of ${label}`} disabled={result.page + 1 >= result.pages} onClick={() => setPage(result.page + 1)}>Next</Button></nav></div>}
  </>;
}
