import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Cloud, Sun, Droplets, Wind, Eye, Thermometer, Newspaper, RefreshCw, MapPin, AlertTriangle } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const WMO_CODES = {
  0: { label: 'Clear sky',       icon: '☀️' },
  1: { label: 'Mainly clear',    icon: '🌤️' },
  2: { label: 'Partly cloudy',   icon: '⛅' },
  3: { label: 'Overcast',        icon: '☁️' },
  45: { label: 'Foggy',          icon: '🌫️' },
  48: { label: 'Icy fog',        icon: '🌫️' },
  51: { label: 'Light drizzle',  icon: '🌦️' },
  53: { label: 'Drizzle',        icon: '🌦️' },
  55: { label: 'Heavy drizzle',  icon: '🌧️' },
  61: { label: 'Light rain',     icon: '🌧️' },
  63: { label: 'Rain',           icon: '🌧️' },
  65: { label: 'Heavy rain',     icon: '🌧️' },
  71: { label: 'Light snow',     icon: '🌨️' },
  73: { label: 'Snow',           icon: '🌨️' },
  75: { label: 'Heavy snow',     icon: '❄️' },
  80: { label: 'Showers',        icon: '🌦️' },
  81: { label: 'Rain showers',   icon: '🌧️' },
  82: { label: 'Violent showers',icon: '⛈️' },
  95: { label: 'Thunderstorm',   icon: '⛈️' },
  96: { label: 'Thunderstorm',   icon: '⛈️' },
  99: { label: 'Thunderstorm',   icon: '⛈️' },
};

// Time-of-day gradient based on current hour
function getTimeGradient(hour) {
  if (hour >= 5  && hour < 7)  return { from: '#1a1035', to: '#f97316', label: 'Dawn',      emoji: '🌅' };
  if (hour >= 7  && hour < 11) return { from: '#1e3a5f', to: '#f59e0b', label: 'Morning',   emoji: '🌄' };
  if (hour >= 11 && hour < 14) return { from: '#0c4a6e', to: '#38bdf8', label: 'Midday',    emoji: '☀️' };
  if (hour >= 14 && hour < 17) return { from: '#1e3a5f', to: '#6366f1', label: 'Afternoon', emoji: '🌇' };
  if (hour >= 17 && hour < 20) return { from: '#1a1035', to: '#f43f5e', label: 'Evening',   emoji: '🌆' };
  if (hour >= 20 && hour < 22) return { from: '#0f0a2a', to: '#7c3aed', label: 'Night',     emoji: '🌃' };
  return { from: '#030712',  to: '#1e1b4b', label: 'Late Night', emoji: '🌙' };
}

const NEWS_CATS = ['tech', 'science', 'world', 'finance', 'health'];
const NEWS_SOURCES = [
  { label: 'HN Top',      url: 'https://hacker-news.firebaseio.com/v0/topstories.json' },
];

function timeAgo(ms) {
  if (!ms) return '';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function Current() {
  const toast = useToast();

  const [weather,      setWeather]      = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);
  const [location,     setLocation]     = useState(null);
  const [city,         setCity]         = useState('');
  const [news,         setNews]         = useState([]);
  const [newsLoading,  setNewsLoading]  = useState(false);
  const [activeCat,    setActiveCat]    = useState('tech');
  const [lastUpdated,  setLastUpdated]  = useState(null);

  const now     = new Date();
  const hour    = now.getHours();
  const tg      = getTimeGradient(hour);

  // ── Geolocation + weather ──────────────────────────────────────────────
  const fetchWeather = useCallback(async (lat, lon) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const params = [
        'temperature_2m', 'weathercode', 'relativehumidity_2m', 'windspeed_10m',
        'apparent_temperature', 'visibility', 'precipitation_probability',
        'uv_index', 'is_day',
      ].join(',');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&current=${params}&hourly=temperature_2m&timezone=auto&forecast_days=1`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();
      setWeather(data);
      setLastUpdated(Date.now());
    } catch (err) {
      setWeatherError('Could not fetch weather. Check network connection.');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const fetchReverseGeo = useCallback(async (lat, lon) => {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      const addr = data.address;
      setCity([addr.city || addr.town || addr.village || addr.county, addr.country].filter(Boolean).join(', '));
    } catch { setCity(`${lat.toFixed(2)}, ${lon.toFixed(2)}`); }
  }, []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setLocation({ lat, lon });
        fetchWeather(lat, lon);
        fetchReverseGeo(lat, lon);
      },
      () => {
        // fallback: London
        setLocation({ lat: 51.5074, lon: -0.1278 });
        fetchWeather(51.5074, -0.1278);
        setCity('London (default)');
        toast.info('Using default location (London). Enable location for accurate weather.');
      }
    );
  }, []);

  // ── News ──────────────────────────────────────────────────────────────
  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      // Hacker News top stories (no CORS issues)
      const ids = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r => r.json());
      const top = ids.slice(0, 12);
      const stories = await Promise.all(top.map(id =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
      ));
      setNews(stories.filter(s => s && s.title).map(s => ({
        id: s.id, title: s.title, url: s.url, score: s.score, comments: s.descendants || 0,
        by: s.by, time: s.time ? s.time * 1000 : null, source: 'Hacker News',
      })));
    } catch {
      setNews([]);
      toast.error('Could not fetch news. Check network connection.');
    } finally {
      setNewsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchNews(); }, []);

  // ── Derived weather values ──────────────────────────────────────────────
  const cur = weather?.current;
  const wmo = WMO_CODES[cur?.weathercode] || { label: 'Unknown', icon: '🌡️' };

  const weatherCards = cur ? [
    { label: 'Feels Like',  val: `${Math.round(cur.apparent_temperature)}°C`, icon: <Thermometer size={16} color="#f43f5e" /> },
    { label: 'Humidity',    val: `${cur.relativehumidity_2m}%`,               icon: <Droplets size={16} color="#0ea5e9" /> },
    { label: 'Wind',        val: `${Math.round(cur.windspeed_10m)} km/h`,     icon: <Wind size={16} color="#8b5cf6" /> },
    { label: 'Visibility',  val: `${Math.round((cur.visibility || 0) / 1000)} km`, icon: <Eye size={16} color="#10b981" /> },
    { label: 'UV Index',    val: String(cur.uv_index || '—'),                 icon: <Sun size={16} color="#f59e0b" /> },
    { label: 'Rain Prob.',  val: `${cur.precipitation_probability || 0}%`,    icon: <Cloud size={16} color="#60a5fa" /> },
  ] : [];

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Hero: Time-of-day gradient */}
      <div style={{
        borderRadius: '20px', overflow: 'hidden', marginBottom: '1.5rem',
        background: `linear-gradient(135deg, ${tg.from}, ${tg.to})`,
        position: 'relative', padding: '2.5rem 2rem',
        boxShadow: `0 8px 40px ${tg.to}33`,
      }}>
        {/* Stars / ambient dots */}
        {hour < 6 || hour >= 20 ? (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} style={{
                position: 'absolute', width: '2px', height: '2px', borderRadius: '50%', background: '#fff',
                left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: Math.random() * 0.6 + 0.2,
              }} />
            ))}
          </div>
        ) : null}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                {tg.emoji} {tg.label} · {now.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-display, system-ui)', marginBottom: '0.25rem' }}>
                {now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {city && (
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} /> {city}
                </p>
              )}
            </div>

            {/* Weather summary */}
            {weatherLoading ? (
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>Loading weather…</div>
            ) : weatherError ? (
              <div style={{ color: 'rgba(255,100,100,0.9)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <AlertTriangle size={14} /> {weatherError}
              </div>
            ) : cur && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '3rem', lineHeight: 1 }}>{wmo.icon}</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{Math.round(cur.temperature_2m)}°C</p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>{wmo.label}</p>
              </div>
            )}
          </div>

          {/* Hour progress bar */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>00:00</span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>Day {Math.round((hour / 24) * 100)}%</span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>24:00</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '99px' }}>
              <div style={{ height: '100%', width: `${(hour / 24) * 100}%`, background: 'rgba(255,255,255,0.7)', borderRadius: '99px', transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Weather detail cards */}
      {!weatherLoading && !weatherError && weatherCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
          {weatherCards.map(w => (
            <div key={w.label} className="glass-card" style={{ textAlign: 'center', padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.3rem' }}>{w.icon}</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-1)', lineHeight: 1 }}>{w.val}</p>
              <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: '3px' }}>{w.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Refresh bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)' }}>Live Feed</p>
          {lastUpdated && <p style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Weather updated {timeAgo(lastUpdated)}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => location && fetchWeather(location.lat, location.lon)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
            <RefreshCw size={12} /> Weather
          </button>
          <button onClick={fetchNews} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
            <RefreshCw size={12} /> News
          </button>
        </div>
      </div>

      {/* News */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <Newspaper size={16} color="var(--accent)" />
          <span className="card-title" style={{ margin: 0 }}>Hacker News — Top Stories</span>
          {newsLoading && <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: 'auto' }}>Loading…</span>}
        </div>

        {news.length === 0 && !newsLoading && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center', padding: '2rem 0' }}>No stories loaded. Click Refresh to retry.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {news.map((story, idx) => (
            <a key={story.id} href={story.url || `https://news.ycombinator.com/item?id=${story.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 0.85rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.12s', alignItems: 'flex-start' }}
                className="hover-lift">
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 800, width: '20px', flexShrink: 0, paddingTop: '2px' }}>{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.4, marginBottom: '3px' }}>{story.title}</p>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>
                    ▲ {story.score} · {story.comments} comments · by {story.by} · {timeAgo(story.time)}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Environmental context */}
      {cur && (
        <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>🌍 Environmental Context</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.65 }}>
            {cur.temperature_2m < 10 ? '🧥 Cold — consider layering up.' : cur.temperature_2m < 18 ? '😌 Cool — comfortable outdoors.' : cur.temperature_2m < 27 ? '☀️ Warm — ideal conditions.' : '🥵 Hot — stay hydrated!'}
            {' '}{(cur.precipitation_probability || 0) > 60 ? '🌧️ Rain likely — bring an umbrella.' : ''}
            {' '}{(cur.uv_index || 0) >= 6 ? `☀️ UV Index ${cur.uv_index} — sunscreen recommended.` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
