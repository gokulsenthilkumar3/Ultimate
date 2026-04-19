import React, { useState, useEffect } from 'react';
import { USER, TABS } from './data/userData';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Overview from './components/Overview';
import Assessment from './components/Assessment';
import Medical from './components/Medical';
import Body3D from './components/Body3D';
import Physique from './components/Physique';
import Training from './components/Training';
import Lifestyle from './components/Lifestyle';
import Nutrition from './components/Nutrition';
import Progress from './components/Progress';
import useLocalStorage from './hooks/useLocalStorage';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useLocalStorage('gt-active-tab', 'overview');
  const [theme, setTheme] = useLocalStorage('gt-theme', 'dark');
  const [palette, setPalette] = useLocalStorage('gt-palette', 'gold');

  // Apply theme and palette attributes to body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-palette', palette);
  }, [theme, palette]);

  // Smooth scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const renderContent = () => {
    const classNames = "fade-in stagger-container";
    switch (activeTab) {
      case 'overview':   return <div className={classNames}><Overview /></div>;
      case 'assessment': return <div className={classNames}><Assessment /></div>;
      case 'medical':    return <div className={classNames}><Medical /></div>;
      case 'body3d':     return <div className={classNames}><Body3D /></div>;
      case 'physique':   return <div className={classNames}><Physique /></div>;
      case 'training':   return <div className={classNames}><Training /></div>;
      case 'nutrition':  return <div className={classNames}><Nutrition /></div>;
      case 'lifestyle':  return <div className={classNames}><Lifestyle /></div>;
      case 'progress':   return <div className={classNames}><Progress /></div>;
      default:           return <div className={classNames}><Overview /></div>;
    }
  };

  return (
    <div className="app-container">
      <div className="mesh-bg"></div>
      
      <Header 
        theme={theme} setTheme={setTheme} 
        palette={palette} setPalette={setPalette} 
      />
      
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <main style={{ padding: '0 1rem' }}>
        {renderContent()}
      </main>

      <footer style={{ padding: '4rem 2rem', textAlign: 'center', opacity: 0.4, fontSize: '0.8rem' }}>
        GrowthTrack Ultimate • Digital Twin Engine v2.0
      </footer>
    </div>
  );
}
