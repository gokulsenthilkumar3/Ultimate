import React, { useState, useEffect, lazy, Suspense } from 'react';
import { USER } from './data/userData';
import Header from './components/Header';
import Navigation from './components/Navigation';
import useLocalStorage from './hooks/useLocalStorage';
import './index.css';

// Lazy-load all dashboard components
const Overview        = lazy(() => import('./components/Overview'));
const Assessment      = lazy(() => import('./components/Assessment'));
const Medical         = lazy(() => import('./components/Medical'));
const HumanoidViewer  = lazy(() => import('./components/HumanoidViewer'));
const Physique        = lazy(() => import('./components/Physique'));
const Training        = lazy(() => import('./components/Training'));
const Lifestyle       = lazy(() => import('./components/Lifestyle'));
const Nutrition       = lazy(() => import('./components/Nutrition'));
const Progress        = lazy(() => import('./components/Progress'));
const SleepDashboard  = lazy(() => import('./components/SleepDashboard'));
const GoalsDashboard  = lazy(() => import('./components/GoalsDashboard'));
const Analytics       = lazy(() => import('./components/Analytics'));
const MindWellness    = lazy(() => import('./components/MindWellness'));
const HydrationTracker = lazy(() => import('./components/HydrationTracker'));
const StrengthMetrics  = lazy(() => import('./components/StrengthMetrics'));
const SettingsPanel   = lazy(() => import('./components/SettingsPanel'));
const Skills            = lazy(() => import('./components/Skills'));

// Simplified Nav Items for Floating Pill
const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'humanoid',     label: '3D Model', badge: 'LIVE' },
  { id: 'physique',     label: 'Blueprint' },
  { id: 'assessment',   label: 'Assessment' },
  { id: 'training',     label: 'Training' },
  { id: 'nutrition',    label: 'Nutrition' },
  { id: 'sleep',        label: 'Sleep' },
  { id: 'lifestyle',    label: 'Lifestyle' },
  { id: 'progress',     label: 'Progress' },
  { id: 'goals',        label: 'Goals' },
    { id: 'skills',      label: 'Skills' },
];

function TabSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: '1rem'
    }}>
      <div className="spin-ring" />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
        LOADING MODULE
      </span>
    </div>
  );
}

function renderTab(tab, user, setUser, theme, setTheme) {
  const props = { user, setUser, theme, setTheme };
  switch (tab) {
    case 'overview':   return <Overview {...props} />;
    case 'humanoid':   return <HumanoidViewer {...props} />;
    case 'physique':   return <Physique {...props} />;
    case 'assessment': return <Assessment {...props} />;
    case 'training':   return <Training {...props} />;
    case 'strength':   return <StrengthMetrics {...props} />;
    case 'nutrition':  return <Nutrition {...props} />;
    case 'hydration':  return <HydrationTracker {...props} />;
    case 'sleep':      return <SleepDashboard {...props} />;
    case 'lifestyle':  return <Lifestyle {...props} />;
    case 'mind':       return <MindWellness {...props} />;
    case 'medical':    return <Medical {...props} />;
    case 'progress':   return <Progress {...props} />;
    case 'goals':      return <GoalsDashboard {...props} />;
    case 'analytics':  return <Analytics {...props} />;
    case 'settings':   return <SettingsPanel {...props} />;
          case 'skills':      return <Skills {...props} />;
    default:           return <Overview {...props} />;
  }
}

export default function App() {
  const [user, setUser]       = useLocalStorage('ultimate_user', USER);
  const [theme, setTheme]     = useLocalStorage('ultimate_theme', 'dark');
  const [palette, setPalette] = useLocalStorage('ultimate_palette', 'gold');
  const [activeTab, setActiveTab] = useLocalStorage('ultimate_tab', 'overview');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handler = () => setSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className="app-shell" data-theme={theme} data-palette={palette}>
      <div className="mesh-bg" />
      
      <div className="main-area">
        <Header
          user={user}
          theme={theme}
          setTheme={setTheme}
          palette={palette}
          setPalette={setPalette}
        />
        
        <main className="content-area">
          <Suspense fallback={<TabSpinner />}>
            {renderTab(activeTab, user, setUser, theme, setTheme)}
          </Suspense>
        </main>
      </div>

      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        navItems={NAV_ITEMS}
      />
    </div>
  );
}
