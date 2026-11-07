import React, { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
import useStore from '../../store/useStore';

const BASE = '/api/integrations/streaming';
const message = error => error?.payload?.error || error?.message || 'The request could not be completed.';
export default function StreamingConnections() {
  const ownerId = useStore(state => state.user?.id);
  const [catalog, setCatalog] = useState(null);
  const [provider, setProvider] = useState('netflix');
  const [csv, setCsv] = useState('');
  const [dateFormat, setDateFormat] = useState('ISO');
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState(null);
  const [grant, setGrant] = useState(null);
  const [rotating, setRotating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);
  useEffect(() => { let active = true;
    apiRequest(BASE).then(data => { if (active) setCatalog(data); }).catch(failure => { if (active) setError(message(failure)); });
    return () => { active = false; sequence.current++; };
  }, [ownerId]);
  useEffect(() => {
    let active = true; setHistory(null); setGrant(null); setPreview(null); setRotating(false); setNotice(''); setError(''); sequence.current++;
    apiRequest(`${BASE}/${provider}/history`).then(data => { if (active) setHistory(data); }).catch(failure => { if (active) setError(message(failure)); });
    return () => { active = false; };
  }, [provider, ownerId]);
  const run = async action => {
    if (busy) return;
    const current = ++sequence.current;
    setBusy(true); setError(''); setNotice('');
    try { await action(() => sequence.current === current && useStore.getState().user?.id === ownerId); }
    catch (failure) { if (sequence.current === current) setError(message(failure)); }
    finally { if (sequence.current === current) setBusy(false); }
  };
  const selected = catalog?.providers.find(item => item.id === provider);
  const refresh = async current => {
    const [next, events] = await Promise.all([apiRequest(BASE), apiRequest(`${BASE}/${provider}/history`)]);
    if (current()) { setCatalog(next); setHistory(events); }
  };
  const importCsv = commit => run(async current => {
    const data = await apiRequest(`${BASE}/${provider}/import`, { method: 'POST', body: JSON.stringify({ csv, dateFormat, commit }), timeoutMs: 60000 });
    if (!current()) return;
    if (!commit) setPreview(data);
    else { setNotice(`${data.imported} events imported; ${data.duplicates} duplicates skipped.`); setPreview(null); await refresh(current); }
  });
  const connect = () => run(async current => {
    const result = await apiRequest(`${BASE}/${provider}/connection`, { method: 'POST', body: '{}' });
    if (current()) { setGrant(result); setRotating(false); await refresh(current); }
  });
  return <section className="streaming-connect glass-card" aria-label="Streaming connections">
    <header><p className="label-caps">Your viewing, together</p><h3>Streaming connections</h3><p>Import your history or send events from an automation you control. These services are not connected directly, and GrowthTrack does not request their passwords.</p></header>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <label>Streaming service<select aria-label="Streaming service" className="form-input" disabled={busy || !catalog} value={provider} onChange={event => { setProvider(event.target.value); setCsv(''); }}>{(catalog?.providers || [{ id: 'netflix', name: 'Netflix' }]).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {selected && <p className="text-secondary">{selected.method} · {selected.webhookEnabled ? 'Custom webhook enabled' : 'Custom webhook off'} · Direct account sync unavailable</p>}
    <div className="streaming-connect__grid">
      <section><h4>Import watch history</h4><p>Netflix: export Viewing activity → Download all. Other services: prepare a CSV with <code>title,watchedAt</code> headers and ISO dates. Optional columns: id, type, status, season, episode, durationMinutes. Up to 500 events / 512 KB.</p>
        {selected?.docs && <a href={selected.docs} target="_blank" rel="noopener noreferrer">Netflix export instructions ↗</a>}
        <label>History CSV<input className="form-input" type="file" accept=".csv,text/csv" disabled={busy} onChange={event => {
          const file = event.target.files?.[0]; setPreview(null); setCsv(''); if (!file) return;
          if (file.size > 512 * 1024) { setError('Choose a CSV smaller than 512 KB.'); return; }
          const version = ++sequence.current;
          file.text().then(text => { if (sequence.current === version) { setCsv(text); setError(''); } }).catch(failure => { if (sequence.current === version) setError(message(failure)); });
        }} /></label>
        {provider === 'netflix' && <label>Export date format<select className="form-input" disabled={busy} value={dateFormat} onChange={event => { setDateFormat(event.target.value); setPreview(null); }}><option value="ISO">YYYY-MM-DD</option><option value="MDY">MM/DD/YY or MM/DD/YYYY</option><option value="DMY">DD/MM/YY or DD/MM/YYYY</option></select></label>}
        <button className="btn-secondary" disabled={busy || !csv} onClick={() => importCsv(false)}>Preview import</button>
        {preview && <div><p>{preview.count} events ready. {preview.warning}</p><ul>{preview.preview.map((event, index) => <li key={`${event.id}-${index}`}>{event.title} — {event.watchedAt}</li>)}</ul><button className="btn-primary" disabled={busy} onClick={() => importCsv(true)}>Import {preview.count} events</button></div>}
      </section>
      <section><h4>Custom webhook</h4><p>Connect your own player or automation using a signed watch event. Enabling this endpoint does not make {selected?.name || 'the service'} send events. No subscription login or browser extension is installed.</p>
        <p>Events need a stable ID, title and watchedAt. Repeated IDs are skipped. Signatures expire after five minutes. Hosted senders require a reachable HTTPS backend; a local app accepts only senders that can reach it.</p>
        {selected?.webhookEnabled ? <div className="streaming-connect__actions"><button className="btn-secondary" disabled={busy} onClick={() => setRotating(true)}>Rotate webhook secret</button><button className="btn-secondary" disabled={busy} onClick={() => run(async current => { await apiRequest(`${BASE}/${provider}/connection`, { method: 'DELETE' }); if (current()) { setGrant(null); await refresh(current); } })}>Disable webhook</button></div> : <button className="btn-primary" disabled={busy || !catalog?.encryptionReady} onClick={connect}>Enable custom webhook</button>}
        {!catalog?.encryptionReady && <p>Server encryption must be configured before creating a webhook secret.</p>}
        {rotating && <div><p>Rotating invalidates the previous secret immediately. Update your sender afterwards.</p><button className="btn-secondary" disabled={busy} onClick={connect}>Confirm secret rotation</button><button className="btn-ghost" disabled={busy} onClick={() => setRotating(false)}>Cancel</button></div>}
        {grant && <div><p>Copy this secret now. It is shown once and kept only in memory here; the server stores it encrypted.</p><label>Webhook signing secret<input className="form-input" type="password" readOnly value={grant.secret} onFocus={event => event.target.select()} /></label><button className="btn-ghost" onClick={() => setGrant(null)}>Hide secret</button></div>}
        {selected && <details><summary>Sender contract</summary><p>POST application/json to this path on your backend:</p><code className="streaming-connect__code">{selected.endpoint}</code><p>Headers: X-GrowthTrack-Timestamp (Unix seconds), X-GrowthTrack-Signature (lowercase hex HMAC-SHA256 of timestamp + "." + exact JSON body, using your secret).</p><pre className="streaming-connect__code">{'{"id":"your-stable-event-id","title":"A title","watchedAt":"2026-11-06T18:00:00Z"}'}</pre><p>The secret authorizes watch-event insertion for this service only. Never place it in a URL or public frontend code.</p></details>}
      </section>
    </div>
    <section><h4>Imported history{history ? ` · ${history.count} events` : ''}</h4><p>History entries are separate from your library progress. Missing durations and completion states remain unknown.</p>{history?.events.length ? <ul className="streaming-connect__history">{history.events.map(event => <li key={event.id}><strong>{event.title}</strong><span>{event.watchedAt} · {event.durationMinutes != null ? `${event.durationMinutes} min recorded` : 'Duration unknown'}</span></li>)}</ul> : <p>No imported history for this service.</p>}{history?.truncated && <p>Showing the 100 most recently imported events.</p>}<button className="btn-ghost" disabled={busy} onClick={() => run(refresh)}>Refresh history</button></section>
  </section>;
}
