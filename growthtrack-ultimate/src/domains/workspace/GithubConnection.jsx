import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function GithubConnection({ onChange }) {
  const [connection, setConnection] = useState(null), [token, setToken] = useState('');
  const [manage, setManage] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [contributions, setContributions] = useState(null), [loadingCounts, setLoadingCounts] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/api/integrations/github/connection', { signal: controller.signal }).then(data => {
      setConnection(data); setManage(data.allowManagement); onChange(data);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [onChange]);
  const connect = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await apiClient.put('/api/integrations/github/connection', { token, allowManagement: manage });
      const next = { ...result, encryptionReady: true }; setConnection(next); onChange(next); setContributions(null);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); setToken(''); }
  };
  const disconnect = async () => {
    setBusy(true); setError('');
    try { await apiClient.delete('/api/integrations/github/connection'); const next = { connected: false, encryptionReady: true }; setConnection(next); onChange(next); setContributions(null); }
    catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };
  const loadCounts = async () => {
    setLoadingCounts(true); setError('');
    try { setContributions(await apiClient.get('/api/integrations/github/contributions')); }
    catch (cause) { setError(cause.message); } finally { setLoadingCounts(false); }
  };
  const collection = contributions?.contributionsCollection;
  return <Card title="GitHub connection" description="Public username lookup works separately. An authorized connection can include private repositories without enabling management.">
    {error && <p role="alert">{error}</p>}
    {connection?.connected ? <div className="connection-actions"><p>Connected as <strong>@{connection.login}</strong> · token encrypted on your server · {connection.allowManagement ? 'management enabled' : 'read-only in GrowthTrack'}</p><Button variant="secondary" onClick={loadCounts} loading={loadingCounts}>Load contribution calendar</Button><Button variant="ghost" onClick={disconnect} disabled={busy}>Disconnect GitHub</Button></div> : <details><summary>Include private repositories</summary><form onSubmit={connect} className="form-stack"><p>Use a token authorized for the repositories you want to see. Organization SSO and fine-grained repository selections still apply. Contribution counts may need profile read permission. This does not make private projects public.</p>
      {connection?.encryptionReady === false && <p role="status">Set APP_ENCRYPTION_KEY on the server before saving a connection.</p>}
      <label>GitHub token<input type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} maxLength={512} required disabled={connection?.encryptionReady === false} /></label>
      <label><input type="checkbox" checked={manage} onChange={event => setManage(event.target.checked)} /> Allow repository create, edit and delete actions after confirmation</label>
      <Button type="submit" disabled={!token || busy || !connection?.encryptionReady}>Connect securely</Button>
    </form></details>}
    {collection && <section aria-label="GitHub contribution calendar"><p><strong>{collection.contributionCalendar.totalContributions}</strong> contributions · {collection.totalCommitContributions} commits · {collection.totalPullRequestContributions} pull requests · {collection.totalIssueContributions} issues</p><div className="github-contribution-calendar" role="img" aria-label={`GitHub reports ${collection.contributionCalendar.totalContributions} contributions in the returned year`}>
      {collection.contributionCalendar.weeks.flatMap(week => week.contributionDays).map(day => <span key={day.date} title={`${day.date}: ${day.contributionCount} contributions`} data-level={day.contributionCount === 0 ? '0' : day.contributionCount < 3 ? '1' : day.contributionCount < 7 ? '2' : '3'} />)}
    </div><p>Counts follow GitHub’s account permissions and privacy settings. Restricted contribution counts do not reveal private repository details.</p></section>}
  </Card>;
}
