import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../ui/Modal';
import { apiClient } from '../../lib/apiClient';
import { FEATURE_BY_ID } from '../../config/featureRegistry';

export default function JevAssistant({ activeTab }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="header-control" aria-label="AI guide, decision feature assistant" onClick={() => setOpen(true)}>AI guide</button>
    <Modal open={open} title="Decision feature assistant" onClose={() => setOpen(false)}>
      {open && <JevPanel key={activeTab} activeTab={activeTab} onNavigate={() => setOpen(false)} />}
    </Modal>
  </>;
}

export function JevPanel({ activeTab, onNavigate }) {
  const [readiness, setReadiness] = useState(null);
  const [request, setRequest] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const lifetime = useRef(null);
  const current = FEATURE_BY_ID[activeTab];
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    apiClient.get('/api/agents/decision/readiness', { signal: controller.signal }).then(setReadiness).catch(() => {
      if (!controller.signal.aborted) setError('Decision status could not be checked. Reopen this panel to retry.');
    });
    return () => controller.abort();
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy || !consent || !request.trim() || !selectedReadiness?.configured) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const advice = await apiClient.post('/api/agents/decision', { request: request.trim(), allowRemote: true, ...(selectedProvider ? { provider: selectedProvider } : {}), ...(current ? { featureId: current.id } : {}) }, { signal: lifetime.current.signal, timeoutMs: 11000 });
      if (!lifetime.current.signal.aborted) setResult(advice);
    } catch (issue) { if (!lifetime.current.signal.aborted) setError(issue.message || 'The decision provider could not return advice. Try again.'); }
    finally { if (!lifetime.current.signal.aborted) { setBusy(false); setConsent(false); } }
  }
  const providerId = selectedProvider || readiness?.provider || 'jev';
  const selectedReadiness = readiness?.providers?.find(item => item.id === providerId) || readiness;
  const providerName = providerId === 'laya' ? 'Laya (local)' : 'Jev / TypeSafe';
  const target = result?.feature && FEATURE_BY_ID[result.feature.id];
  return <form onSubmit={submit}>
    <p>Find the right app feature for your next step. The selected provider suggests a destination; it does not change records.</p>
    <p>Decision provider: {providerName}</p>
    {readiness?.providers && <label>Decision provider<select className="form-input" value={providerId} disabled={busy} onChange={event => { setSelectedProvider(event.target.value); setConsent(false); setResult(null); setError(''); }}>{readiness.providers.map(item => <option key={item.id} value={item.id}>{item.id === 'laya' ? 'Laya (local)' : 'Jev / TypeSafe'}{item.configured ? '' : ' · setup needed'}</option>)}</select></label>}
    <p role="status">{readiness ? selectedReadiness.configured ? `Configured for ${readiness.features?.length || 0} features. Live connection has not been verified.` : selectedReadiness.enabled ? 'Enabled · setup needed: configure the selected decision provider and restart the API.' : 'Setup needed: enable and configure the selected decision provider.' : 'Checking decision configuration…'}</p>
    {current && <p>Current feature: {current.label}</p>}
    <label htmlFor="jev-request">What would you like to do?</label>
    <textarea id="jev-request" className="form-input" rows={4} maxLength={2000} value={request} disabled={busy} onChange={event => { setRequest(event.target.value); setConsent(false); setResult(null); }} />
    <label style={{ display: 'flex', gap: 8, marginBlock: 12 }}><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />Send this text and the current feature name to {providerName} for this request. No app records are attached.</label>
    <button className="btn-primary" type="submit" disabled={!selectedReadiness?.configured || !request.trim() || !consent || busy}>{busy ? 'Asking…' : 'Ask for advice'}</button>
    {error && <p role="alert">{error}</p>}
    {result && <section aria-label="Decision advice"><p>{result.status === 'abstain' ? 'The decision provider could not choose confidently. Refine your request or browse the app.' : target ? `Suggested feature: ${target.label}` : `Suggested assistant: ${result.recommendation}`}</p>
      {target && <><Link to={target.canonicalPath} onClick={onNavigate}>Open {target.label}</Link>{target.availability !== 'ready' && <p>This feature may require configuration or additional permissions.</p>}</>}
      <p>Review the suggestion. Normal feature permissions and save confirmations still apply.</p>
    </section>}
  </form>;
}
