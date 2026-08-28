import React, { useEffect, useRef, useState } from 'react';
import { Map, Navigation, Compass, ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';

export default function Maps() {
  const mapsConfig = useStore(s => s.appConfig?.maps || {});
  const [syncing, setSyncing] = useState(false);
  const [tracking, setTracking] = useState(Boolean(mapsConfig.browserTrackingEnabled));
  const [locations, setLocations] = useState([]);
  const [message, setMessage] = useState('Location sync is off until you opt in.');
  const watchRef = useRef(null);

  const refresh = async () => { try { setLocations(await apiSync('/locations', 'GET')); } catch { setLocations([]); } };
  useEffect(() => { refresh(); }, []);

  const savePosition = async ({ coords }) => {
    const point = await apiSync('/locations', 'POST', { latitude: coords.latitude, longitude: coords.longitude, accuracyM: coords.accuracy, source: 'browser', capturedAt: new Date().toISOString() });
    setLocations(rows => [point, ...rows]); setMessage('Location saved to the local timeline.'); setSyncing(false);
  };
  const onLocationError = () => { setMessage('Location permission was not granted.'); setSyncing(false); setTracking(false); };
  const syncLocation = () => {
    if (!navigator.geolocation) { setMessage('This browser does not provide location access.'); return; }
    setSyncing(true); navigator.geolocation.getCurrentPosition(savePosition, onLocationError, { maximumAge: 300000, timeout: 10000 });
  };
  useEffect(() => {
    if (!tracking || !navigator.geolocation) return undefined;
    watchRef.current = navigator.geolocation.watchPosition(savePosition, onLocationError, { maximumAge: Math.max(60000, Number(mapsConfig.syncIntervalMinutes || 15) * 60000), timeout: 20000 });
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [tracking, mapsConfig.syncIntervalMinutes]);

  const toggleTracking = async () => {
    const next = !tracking; setTracking(next);
    await apiSync('/config/maps', 'PUT', { value: { ...mapsConfig, browserTrackingEnabled: next }, category: 'integration' });
    setMessage(next ? 'Automatic sync is active while GrowthTrack is open.' : 'Automatic sync is off.');
  };

  return <div className="fade-in module-page maps-page">
    <div className="page-hero glass-card"><p className="eyebrow"><Navigation size={14} /> Location timeline</p><h2 className="text-display">Maps & places</h2><p className="text-secondary">Location points are saved in your local database. Automatic browser tracking runs while GrowthTrack is open and location permission remains enabled.</p></div>
    <div className="maps-grid">
      <section className="glass-card maps-sync-card"><div className="maps-icon"><Compass size={28} /></div><h3>Local timeline</h3><p className="text-secondary">{locations.length} saved point{locations.length === 1 ? '' : 's'}.</p><div className="maps-actions"><button className="btn-primary" onClick={syncLocation} disabled={syncing}><RefreshCw size={15} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing…' : 'Sync now'}</button><button className="btn-secondary" onClick={toggleTracking}>{tracking ? 'Stop automatic sync' : 'Start automatic sync'}</button></div><p className="maps-status"><ShieldCheck size={14} /> {message}</p>{locations[0] && <p className="maps-last-sync">Last sync: {new Date(locations[0].capturedAt).toLocaleString()}</p>}</section>
      <section className="glass-card maps-sync-card"><div className="maps-icon"><Map size={28} /></div><h3>Google Maps Timeline</h3><p className="text-secondary">Google does not expose a general Timeline-read API. GrowthTrack can record its own timeline, while this link opens your Google-managed history.</p>{mapsConfig.timelineUrl && <a className="btn-secondary" href={mapsConfig.timelineUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Open Google Timeline</a>}</section>
    </div>
  </div>;
}
