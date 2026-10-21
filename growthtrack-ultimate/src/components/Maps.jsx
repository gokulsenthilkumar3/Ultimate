import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Map, Navigation, ShieldCheck } from 'lucide-react';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';
import useHashTab from '../hooks/useHashTab';
import { formatDateTime } from '../utils/userFormatters';
import PageState from './ui/PageState';
import LoadingSkeleton from './ui/LoadingSkeleton';
import Tabs from './ui/Tabs';

const MapCanvas = lazy(() => import('./places/MapCanvas'));
const VIEWS = [{ value: 'list', label: 'List' }, { value: 'map', label: 'Map' }, { value: 'timeline', label: 'Timeline' }, { value: 'privacy', label: 'Privacy' }];
export default function Maps() {
  const user = useStore(state => state.user);
  const [view, selectView] = useHashTab(VIEWS.map(item => item.value), 'list');
  const [tracking, setTracking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [tilesAllowed, setTilesAllowed] = useState(false);
  const [message, setMessage] = useState('Location capture is off on this device.');
  const watchRef = useRef(null);
  const lastSample = useRef(0);
  const queryClient = useQueryClient();
  const locations = useQuery({ queryKey: ['locations', user?.id], queryFn: () => apiRequest('/api/locations') });
  const create = useMutation({
    mutationFn: position => apiRequest('/api/locations', { method: 'POST', body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyM: position.coords.accuracy, source: 'browser', capturedAt: new Date(position.timestamp || Date.now()).toISOString() }) }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['locations', user?.id] }); setMessage('Location saved to your private server timeline.'); },
    onError: error => { setMessage(error.message || 'The location was not saved.'); },
    onSettled: () => setLocating(false),
  });
  const remove = useMutation({
    mutationFn: id => apiRequest(`/api/locations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['locations', user?.id] }); setMessage('Saved location deleted.'); },
    onError: error => setMessage(error.message || 'Deletion failed. The record is still saved.'),
  });
  const capture = position => { lastSample.current = Date.now(); create.mutate(position); };
  const denied = error => { setLocating(false); setTracking(false); setMessage(error.code === 1 ? 'Location permission was denied. No location was saved.' : 'Location is currently unavailable. You can retry.'); };
  const captureOnce = () => {
    if (!navigator.geolocation) { setMessage('Location access is unavailable in this browser.'); return; }
    setLocating(true); navigator.geolocation.getCurrentPosition(capture, denied, { maximumAge: 0, timeout: 15000 });
  };
  useEffect(() => {
    if (!tracking || !navigator.geolocation) return undefined;
    watchRef.current = navigator.geolocation.watchPosition(position => {
      if (Date.now() - lastSample.current >= 60000) capture(position);
    }, denied, { maximumAge: 60000, timeout: 20000 });
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; };
  // Callbacks remain current via mutation state, tracking is always explicit and resets on navigation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking]);
  const points = Array.isArray(locations.data) ? locations.data : [];
  return <section className="module-page maps-page">
    <header className="page-header"><div><p className="eyebrow"><Navigation size={16} aria-hidden="true" /> Life</p><h1>Maps & places</h1><p className="page-subtitle">Capture only when you choose. Saved coordinates remain private to your account.</p></div><button className="btn-primary" type="button" onClick={captureOnce} disabled={locating || create.isPending}>{locating || create.isPending ? 'Saving location…' : 'Save current location'}</button></header>
    <Tabs label="Places views" idPrefix="places-view" tabs={VIEWS} value={view} onChange={selectView} />
    <p role="status"><ShieldCheck size={16} aria-hidden="true" /> {message}</p>
    {view === 'privacy' ? <section className="glass-card"><h2>Location privacy</h2><p>Tracking is off by default and never restored from another device. It stops when you leave this page. Browser permissions can be revoked in your browser settings.</p><button type="button" className="btn-secondary" onClick={() => { if (!navigator.geolocation) { setMessage('Location access is unavailable.'); return; } setTracking(value => !value); }} aria-pressed={tracking}>{tracking ? 'Stop capture' : 'Enable capture while this page is open'}</button><p>Delete individual samples in List. There is no automatic retention policy yet; your server backups may retain removed samples.</p><p>Loading a map requests tiles from OpenStreetMap and reveals your network address and viewed map area to that service. GrowthTrack does not bulk-download or cache map tiles for offline use.</p></section> : <>
      {locations.isPending ? <LoadingSkeleton /> : locations.isError ? <PageState state="error" title="Saved places could not be loaded" description="This error does not mean your timeline is empty." onRetry={locations.refetch} /> : <>
        {view === 'map' && (!tilesAllowed ? <section className="glass-card"><h2><Map size={18} aria-hidden="true" /> Optional map</h2><p>Map tiles are provided by OpenStreetMap. Loading them discloses your network address and viewed area. The list below works without third-party tiles.</p><button className="btn-secondary" type="button" onClick={() => setTilesAllowed(true)}>Load third-party map</button></section> : <Suspense fallback={<LoadingSkeleton />}><MapCanvas points={points} /></Suspense>)}
        <section className="glass-card" aria-label="Saved location samples"><h2>{view === 'timeline' ? 'Location timeline' : 'Saved samples'}</h2>{!points.length ? <p>No location samples saved. Capture remains off until you choose it.</p> : <ol className="places-list">{points.map(point => <li key={point.id}><div><strong>{formatDateTime(point.capturedAt, user)}</strong><p>{Number(point.latitude).toFixed(5)}, {Number(point.longitude).toFixed(5)} · {point.accuracyM == null ? 'Accuracy unavailable' : `±${Math.round(point.accuracyM)} m`} · {point.source}</p><a href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=15/${point.latitude}/${point.longitude}`} target="_blank" rel="noopener noreferrer">Open external map</a></div><button type="button" className="btn-secondary" disabled={remove.isPending} onClick={() => { if (window.confirm('Delete this saved location sample? Backups may retain it.')) remove.mutate(point.id); }}>Delete sample</button></li>)}</ol>}</section>
      </>}
    </>}
  </section>;
}
