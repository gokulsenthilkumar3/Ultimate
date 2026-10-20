import React, { useId, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarSync, ChevronDown, CircleAlert, KeyRound, Landmark, LineChart, Link2, RefreshCw, Unplug } from 'lucide-react';
import useStore from '../../store/useStore';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import Switch from '../ui/Switch';
import TextField from '../ui/TextField';
import StatusBadge from '../ui/StatusBadge';
import ConfirmDialog from '../ui/ConfirmDialog';
import { disconnectConnection, listConnectors, publishSyncData, runConnection, saveConnection } from '../../api/sync';
import { describeRun, relativeTime } from './syncFormat';
import './syncCenter.css';

const ICONS = { mfapi: Landmark, coingecko: LineChart, alphavantage: LineChart, ics: CalendarSync };
const STATUS = {
  connected: ['success', 'Live'], available: ['neutral', 'Not connected'], paused: ['warning', 'Paused'],
  'needs-key': ['warning', 'Server key needed'], error: ['danger', 'Needs attention'],
};
const RUN_TONE = { success: 'success', partial: 'warning', failed: 'danger' };

function cadence(minutes) {
  return minutes >= 60 ? `every ${Math.round(minutes / 60)} h` : `every ${minutes} min`;
}

function ConnectorCard({ connector, ownerId, onChanged }) {
  const toast = useToast();
  const formId = useId();
  const connection = connector.connection;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [issues, setIssues] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [removeData, setRemoveData] = useState(false);
  const Icon = ICONS[connector.key] || Link2;
  const [tone, label] = STATUS[connector.status] || STATUS.available;
  const lastRun = connection?.lastRun;
  const needsForm = connector.fields.length > 0;

  const report = run => {
    if (!run) return;
    publishSyncData(run.data, ownerId);
    setIssues(run.issues || []);
    if (run.status === 'failed') toast.error(run.message || `${connector.label} could not sync.`);
    else toast.success(`${connector.label}: ${describeRun(run)}`);
  };

  const submit = async event => {
    event?.preventDefault();
    setBusy('save'); setError('');
    try {
      const config = { ...(connection?.config || {}), ...values };
      const result = await saveConnection(connector.key, { config, autoSync: connection?.autoSync ?? true, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      setEditing(false); setValues({});
      report(result.run);
      await onChanged();
    } catch (failure) { setError(failure?.payload?.error || failure?.message || 'The connection could not be saved.'); }
    finally { setBusy(''); }
  };

  const syncNow = async () => {
    setBusy('sync');
    try { report(await runConnection(connector.key)); }
    catch (failure) { toast.error(failure?.payload?.error || failure?.message || 'Sync failed.'); }
    finally { setBusy(''); await onChanged(); }
  };

  const toggleAuto = async autoSync => {
    setBusy('auto');
    try { await saveConnection(connector.key, { config: connection?.config || {}, autoSync, runNow: false }); await onChanged(); }
    catch (failure) { toast.error(failure?.payload?.error || 'Auto-sync could not be changed.'); }
    finally { setBusy(''); }
  };

  const disconnect = async () => {
    const result = await disconnectConnection(connector.key, { removeData });
    publishSyncData(result.data, ownerId);
    setConfirming(false); setIssues([]);
    toast.success(result.removed ? `${connector.label} disconnected · ${result.removed} events removed` : `${connector.label} disconnected`);
    await onChanged();
  };

  return <article className="gt-sync-card" data-status={connector.status} aria-labelledby={`${formId}-title`}>
    <header className="gt-sync-card__head">
      <span className="gt-sync-card__icon" aria-hidden="true"><Icon size={20} /></span>
      <div className="gt-sync-card__title">
        <h3 id={`${formId}-title`}>{connector.label}</h3>
        <p>{connector.provider} · {cadence(connector.autoSyncMinutes)}</p>
      </div>
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </header>
    <p className="gt-sync-card__description">{connector.description}</p>

    {connector.status === 'needs-key' && <p className="gt-sync-card__notice" role="note"><KeyRound size={15} aria-hidden="true" /> This source stores a private address or key. Set <code>APP_ENCRYPTION_KEY</code> on the server to enable it.</p>}
    {connector.status === 'error' && <p className="gt-sync-card__notice is-danger" role="alert"><CircleAlert size={15} aria-hidden="true" /> {connection?.error}</p>}

    {connection && connector.status !== 'error' && <div className="gt-sync-card__run" role="status">
      <StatusBadge tone={RUN_TONE[lastRun?.status] || 'neutral'}>{lastRun ? relativeTime(lastRun.at) : 'Pending'}</StatusBadge>
      <span>{describeRun(lastRun)}</span>
    </div>}

    {issues.length > 0 && <details className="gt-sync-card__issues">
      <summary><ChevronDown size={14} aria-hidden="true" /> {issues.length} item{issues.length === 1 ? '' : 's'} need attention</summary>
      <ul>{issues.slice(0, 12).map((issue, index) => <li key={`${issue.id || issue.title}-${index}`}><strong>{issue.name || issue.title}</strong> — {issue.reason}</li>)}</ul>
    </details>}

    {editing && <form className="gt-sync-card__form" onSubmit={submit} aria-label={`${connector.label} settings`}>
      {connector.fields.map(field => <TextField key={field.name} label={field.label} hint={field.help}
        type={field.type === 'secret' ? 'password' : field.type === 'color' ? 'color' : 'text'} autoComplete="off" spellCheck={false}
        required={field.required && !(field.type === 'secret' && connection?.hasSecret)}
        placeholder={field.type === 'secret' && connection?.hasSecret ? 'Saved — leave blank to keep' : field.placeholder}
        value={values[field.name] ?? (field.type === 'secret' ? '' : connection?.config?.[field.name] ?? (field.type === 'color' ? field.placeholder : ''))}
        onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))} />)}
      {error && <p className="gt-field__error" role="alert">{error}</p>}
      <div className="gt-sync-card__actions">
        <Button type="submit" loading={busy === 'save'} loadingLabel="Connecting and syncing…">{connection ? 'Save and sync' : 'Connect and sync'}</Button>
        <Button type="button" variant="ghost" onClick={() => { setEditing(false); setValues({}); setError(''); }}>Cancel</Button>
      </div>
    </form>}

    {!editing && <footer className="gt-sync-card__actions">
      {!connection && connector.status !== 'needs-key' && <Button icon={<Link2 size={16} />} loading={busy === 'save'} loadingLabel="Connecting…"
        onClick={() => needsForm ? setEditing(true) : submit()}>Connect</Button>}
      {connection && connector.status !== 'error' && <Button variant="secondary" icon={<RefreshCw size={16} />} loading={busy === 'sync'} loadingLabel="Syncing…" onClick={syncNow}>Sync now</Button>}
      {connection && needsForm && <Button variant="ghost" onClick={() => setEditing(true)}>Settings</Button>}
      {connection && <Button variant="ghost" icon={<Unplug size={16} />} onClick={() => setConfirming(true)}>Disconnect</Button>}
    </footer>}

    {connection && connector.status !== 'error' && <div className="gt-sync-card__auto">
      <Switch label="Sync automatically" description={`Checks ${cadence(connector.autoSyncMinutes)} while the server runs.`} checked={connection.autoSync} disabled={busy === 'auto'} onChange={toggleAuto} />
    </div>}

    <ConfirmDialog open={confirming} title={`Disconnect ${connector.label}?`} confirmLabel="Disconnect"
      description={connector.target === 'calendar' ? <>
        Automatic updates stop and the saved address is erased.
        <label className="gt-sync-card__remove"><input type="checkbox" checked={removeData} onChange={event => setRemoveData(event.target.checked)} /> Also remove the mirrored events from my calendar</label>
      </> : 'Automatic price updates stop. Prices already recorded stay in your history.'}
      onCancel={() => setConfirming(false)} onConfirm={disconnect} />
  </article>;
}

/** Live data sources. Each connected source replaces a manual entry flow:
    prices for holdings, events for the calendar. */
export default function SyncCenter({ target, title = 'Live data sources', description }) {
  const ownerId = useStore(state => state.user?.id ?? null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['sync-connectors', ownerId], queryFn: listConnectors, enabled: Boolean(ownerId), staleTime: 30_000 });
  const connectors = useMemo(() => (query.data?.connectors || []).filter(item => !target || item.target === target), [query.data, target]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['sync-connectors', ownerId] });
  const live = connectors.filter(item => item.status === 'connected').length;

  return <section className="gt-sync-center" aria-labelledby="gt-sync-center-title" aria-busy={query.isLoading}>
    <header className="gt-sync-center__head">
      <div>
        <h2 id="gt-sync-center-title">{title}</h2>
        <p>{description || 'Connect a source once and GrowthTrack keeps it current — no retyping prices or events. Every update is dated and attributed to its source.'}</p>
      </div>
      {connectors.length > 0 && <StatusBadge tone={live ? 'success' : 'neutral'}>{live} of {connectors.length} live</StatusBadge>}
    </header>
    {query.isLoading && <p className="gt-sync-center__state" role="status">Loading sources…</p>}
    {query.isError && <div className="gt-sync-center__state" role="alert">
      <p>Sources could not be loaded. Your data is unchanged.</p>
      <Button variant="secondary" onClick={() => query.refetch()}>Try again</Button>
    </div>}
    <div className="gt-sync-center__grid">
      {connectors.map(connector => <ConnectorCard key={connector.key} connector={connector} ownerId={ownerId} onChanged={refresh} />)}
    </div>
  </section>;
}
