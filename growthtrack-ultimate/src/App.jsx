import React, { useState, useEffect, lazy, Suspense } from 'react';
import { USER } from './data/userData';
import Header from './components/Header';
import Navigation from './components/Navigation';
import SettingsPanel from './components/SettingsPanel';
import useLocalStorage from './hooks/useLocalStorage';
import './index.css';

// Lazy-load all tab components for faster initial load
const Overview       = lazy(() => import('./components/Overview'));
const Assessment     = lazy(() => import('./components/Assessment'));
const Medical        = lazy(() => import('./components/Medical'));
const Body3D         = lazy(() => import('./components/Body3D'));
const Physique       = lazy(() => import('./components/Physique'));
const Training       = lazy(() => import('./components/Training'));
const Lifestyle      = lazy(() => import('./components/Lifestyle'));
const Nutrition      = lazy(() => import('./components/Nutrition'));
const Progress       = lazy(() => import('./components/Progress'));
const SleepDashboard = lazy(() => import('./components/SleepDashboard'));
const GoalsDashboard = lazy(() => import('./components/GoalsDashboard'));
const Analytics      = lazy(() => import('./components/Analytics'));

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

export default function App() {
  const [activeTab, setActiveTab]           = useLocalStorage('gt-active-tab', 'overview');
  const [theme, setTheme]                   = useLocalStorage('gt-theme', 'dark');
  const [palette, setPalette]               = useLocalStorage('gt-palette', 'gold');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPart, setSelectedPart]     = useState(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-palette', palette);
  }, [theme, palette]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedPart(null);
  };

  const renderTab = () => {
    const cls = 'fade-in stagger-container';
    switch (activeTab) {
      case 'overview':    return <div className={cls}><Overview /></div>;
      case 'assessment':  return <div className={cls}><Assessment /></div>;
      case 'medical':     return <div className={cls}><Medical /></div>;
      case 'body3d':      return <div className={cls}><Body3D onSelectPart={setSelectedPart} /></div>;
      case 'physique':    return <div className={cls}><Physique /></div>;
      case 'training':    return <div className={cls}><Training /></div>;
      case 'nutrition':   return <div className={cls}><Nutrition /></div>;
      case 'lifestyle':   return <div className={cls}><Lifestyle /></div>;
      case 'progress':    return <div className={cls}><Progress /></div>;
      case 'sleep':       return <div className={cls}><SleepDashboard /></div>;
      case 'goals':       return <div className={cls}><GoalsDashboard /></div>;
      case 'analytics':   return <div className={cls}><Analytics /></div>;
      default:            return <div className={cls}><Overview /></div>;
    }
  };

  return (
    <div className="app-container">
      <div className="mesh-bg" />

      <Header
        theme={theme}
        setTheme={setTheme}
        palette={palette}
        setPalette={setPalette}
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={USER}
      />

      <Navigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />

      <main className="main-content">
        <Suspense fallback={<TabSpinner />}>
          {renderTab()}
        </Suspense>
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        palette={palette}
        setPalette={setPalette}
      />

      <footer className="app-footer">
        <span>Ultimate — Digital Twin Engine v2.0</span>
        <span style={{ color: 'var(--text-muted)' }}>●</span>
        <span style={{ color: 'var(--text-muted)' }}>{USER.name || 'Gokul'}</span>
      </footer>
    </div>
  );
}
