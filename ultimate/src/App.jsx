import React, { useEffect, lazy, Suspense } from 'react';
import { useUserStore } from './store/userStore';
import Header from './components/Header';
import Navigation from './components/Navigation';
import useLocalStorage from './hooks/useLocalStorage';
import './index.css'; import './overrides.css';

// Lazy-loaded tab components
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
const HydrationTracker= lazy(() => import('./components/HydrationTracker'));
const StrengthMetrics = lazy(() => import('./components/StrengthMetrics'));
const SettingsPanel   = lazy(() => import('./components/SettingsPanel'));
const Skills          = lazy(() => import('./components/Skills'));
const HealthExtras    = lazy(() => import('./components/HealthExtras'));
const Shopping        = lazy(() => import('./components/Shopping'));
const Tasks           = lazy(() => import('./components/Tasks'));
const Finance         = lazy(() => import('./components/Finance'));
const Entertainment   = lazy(() => import('./components/Entertainment'));
const Info            = lazy(() => import('./components/Info'));

// Navigation tab definitions — only tabs visible in the nav bar
export const NAV_ITEMS = [
  { id: 'overview',       label: 'Overview' },
  { id: 'humanoid',       label: '3D Model',       badge: 'LIVE' },
  { id: 'physique',       label: 'Blueprint' },
  { id: 'assessment',     label: 'Assessment' },
  { id: 'training',       label: 'Training' },
  { id: 'nutrition',      label: 'Nutrition' },
  { id: 'sleep',          label: 'Sleep' },
  { id: 'lifestyle',      label: 'Lifestyle' },
  { id: 'progress',       label: 'Progress' },
  { id: 'goals',          label: 'Goals' },
  { id: 'skills',         label: 'Skills' },
  { id: 'health',         label: 'Health+' },
  { id: 'shopping',       label: 'Shopping' },
  { id: 'tasks',          label: 'Tasks' },
  { id: 'finance',        label: 'Finance' },
  { id: 'entertainment',  label: 'Entertainment' },
  { id: 'analytics',      label: 'Analytics',      badge: 'NEW' },
  { id: 'strength',       label: 'Strength' },
  { id: 'hydration',      label: 'Hydration' },
  { id: 'mind',           label: 'Mind' },
  { id: 'medical',        label: 'Medical' },
  { id: 'settings',       label: 'Settings' },
  { id: 'info',           label: 'About',           badge: 'v2' },
];

// TAB_MAP: O(1) lookup replaces long switch statement.
// Add new tabs here — no other code needs to change.
const TAB_MAP = {
  overview:      (props) => <Overview      {...props} />,
  humanoid:      (props) => <HumanoidViewer {...props} />,
  physique:      (props) => <Physique      {...props} />,
  assessment:    (props) => <Assessment    {...props} />,
  training:      (props) => <Training      {...props} />,
  strength:      (props) => <StrengthMetrics {...props} />,
  nutrition:     (props) => <Nutrition     {...props} />,
  hydration:     (props) => <HydrationTracker {...props} />,
  sleep:         (props) => <SleepDashboard {...props} />,
  lifestyle:     (props) => <Lifestyle     {...props} />,
  mind:          (props) => <MindWellness  {...props} />,
  medical:       (props) => <Medical       {...props} />,
  progress:      (props) => <Progress      {...props} />,
  goals:         (props) => <GoalsDashboard {...props} />,
  analytics:     (props) => <Analytics     {...props} />,
  settings:      (props) => <SettingsPanel  {...props} />,
  skills:        (props) => <Skills        {...props} />,
  health:        (props) => <HealthExtras  {...props} />,
  shopping:      (props) => <Shopping      {...props} />,
  tasks:         (props) => <Tasks         {...props} />,
  finance:       (props) => <Finance       {...props} />,
  entertainment: (props) => <Entertainment {...props} />,
  info:          ()      => <Info />,
};

function TabSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: '1rem'
    }}>
      <div className='spin-ring' />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
        LOADING MODULE
      </span>
    </div>
  );
}

export default function App() {
  const { user, updateField, updateSection, fetchUser } = useUserStore();
  const [theme,   setTheme]   = useLocalStorage('ultimate_theme',   'dark');
  const [palette, setPalette] = useLocalStorage('ultimate_palette', 'gold');
  const [activeTab, setActiveTab] = useLocalStorage('ultimate_tab', 'overview');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
  }, [palette]);

  useEffect(() => {
    fetchUser();
  }, []);

  const tabProps = { user, updateField, updateSection, theme, setTheme, palette, setPalette };

  // Resolve component from TAB_MAP; fallback to Overview if tab id unknown
  const renderTab = TAB_MAP[activeTab] ?? TAB_MAP['overview'];

  return (
    <div className='app-shell'>
      <Header
        user={user}
        theme={theme} setTheme={setTheme}
        palette={palette} setPalette={setPalette}
      />
      <Navigation
        navItems={NAV_ITEMS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <main className='tab-content'>
        <Suspense fallback={<TabSpinner />}>
          {renderTab(tabProps)}
        </Suspense>
      </main>
    </div>
  );
}
