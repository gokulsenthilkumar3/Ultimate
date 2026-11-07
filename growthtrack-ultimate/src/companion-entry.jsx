import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import KineticProvider from './components/motion/KineticProvider';
import CompanionTools from './components/motion/CompanionTools';
import AgentKite from './components/motion/AgentKite';
import useFocusCompanion from './hooks/useFocusCompanion';
import './styles/fonts.css';
import './styles/app-styles.css';
import './components/motion/floating-companion.css';
import './styles/desktop-companion.css';

function CompanionWindow() {
  const { user, loading } = useAuth(); const focus = useFocusCompanion(user?.id);
  const close = () => void window.growthTrackDesktop?.closeCompanion?.();
  return <main className="desktop-companion-window" onClickCapture={event => {
    const anchor = event.target.closest('a'); if (!anchor || !window.growthTrackDesktop?.openFeature) return;
    const path = new URL(anchor.href).pathname;
    const feature = path.includes('/notes') ? 'notes' : path.includes('/current') ? 'current' : path.includes('/calendar') ? 'calendar' : 'ai';
    event.preventDefault(); void window.growthTrackDesktop.openFeature(feature);
  }}><header className="desktop-companion-window__handle"><span>GrowthTrack · drag to move</span><button type="button" onClick={close} aria-label="Close desktop companion">×</button></header>
    <div className="desktop-companion-window__body"><div className="desktop-companion-window__portrait"><AgentKite state={focus.timer?.phase === 'running' ? 'listen' : 'greet'} /></div><h1>Kite, your little sidekick.</h1>
      {loading ? <p role="status">Checking your Ultimate session…</p> : user ? <CompanionTools user={user} focus={focus} onHide={close} /> : <><p>Sign in through Ultimate before saving notes and reminders.</p><button type="button" className="btn-primary" onClick={() => void window.growthTrackDesktop?.openFeature?.('ai')}>Open Ultimate</button></>}
    </div>
  </main>;
}
document.documentElement.dataset.companionWindow = 'true';
createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><KineticProvider><CompanionWindow /></KineticProvider></AuthProvider></BrowserRouter>);
