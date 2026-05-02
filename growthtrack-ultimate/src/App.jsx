import React, { lazy, Suspense, useEffect } from 'react';
import useStore, {
  selectUser, selectSetUser, selectTheme, selectPalette,
  selectSetTheme, selectSetPalette, selectActiveTab, selectSetActiveTab,
  selectFetchInitialData,
} from './store/useStore';
import { ToastProvider } from './hooks/useToast';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import './index.css';
import './styles/chamber.css';

import { preloadHumanoidModel } from './components/morphEngine/useModelLoader';
import { useVascularitySync } from './store/use3DStore.usage';

preloadHumanoidModel();

// ── Lazy-load all dashboard modules
const Overview           = lazy(() => import('./components/Overview'));
const Assessment         = lazy(() => import('./components/Assessment'));
const Medical            = lazy(() => import('./components/Medical'));
const HumanoidViewer     = lazy(() => import('./components/HumanoidViewer'));
const Physique           = lazy(() => import('./components/Physique'));
const Training           = lazy(() => import('./components/Training'));
const Lifestyle          = lazy(() => import('./components/Lifestyle'));
const Nutrition          = lazy(() => import('./components/Nutrition'));
const Progress           = lazy(() => import('./components/Progress'));
const SleepDashboard     = lazy(() => import('./components/SleepDashboard'));
const GoalsDashboard     = lazy(() => import('./components/GoalsDashboard'));
const Analytics          = lazy(() => import('./components/Analytics'));
const MindWellness       = lazy(() => import('./components/MindWellness'));
const HydrationTracker   = lazy(() => import('./components/HydrationTracker'));
const StrengthMetrics    = lazy(() => import('./components/StrengthMetrics'));
const ProfileEditor      = lazy(() => import('./components/ProfileEditor'));
const Skills             = lazy(() => import('./components/Skills'));
const HealthExtras       = lazy(() => import('./components/HealthExtras'));
const Shopping           = lazy(() => import('./components/Shopping'));
const Tasks              = lazy(() => import('./components/Tasks'));
const Finance            = lazy(() => import('./components/Finance'));
const Entertainment      = lazy(() => import('./components/Entertainment'));
const About              = lazy(() => import('./components/About'));
const Calendar           = lazy(() => import('./components/Calendar'));
const Timesheet          = lazy(() => import('./components/Timesheet'));
const Logs               = lazy(() => import('./components/Logs'));
const Portfolio          = lazy(() => import('./components/Portfolio'));
const Projects           = lazy(() => import('./components/Projects'));
const Databases          = lazy(() => import('./components/Databases'));
const SocialMedia        = lazy(() => import('./components/SocialMedia'));
const AiDashboard        = lazy(() => import('./components/AiDashboard'));
const Maps               = lazy(() => import('./components/Maps'));
const Documents          = lazy(() => import('./components/Documents'));
const Current            = lazy(() => import('./components/Current'));
const Notes              = lazy(() => import('./components/Notes'));
const AppLauncher        = lazy(() => import('./components/AppLauncher'));
const Dashboards         = lazy(() => import('./components/Dashboards'));

// ── Master map of all modules to get their labels
export const GLOBAL_MODULES = {
  overview: 'Overview', humanoid: '3D Model', physique: 'Blueprint', assessment: 'Assessment',
  training: 'Training', nutrition: 'Nutrition', sleep: 'Sleep', lifestyle: 'Lifestyle',
  progress: 'Progress', goals: 'Goals', skills: 'Skills', health: 'Health+',
  shopping: 'Shopping', tasks: 'Tasks', projects: 'Projects', portfolio: 'Portfolio',
  calendar: 'Calendar', timesheet: 'Timesheet', finance: 'Finance', entertainment: 'Entertainment',
  social: 'Social Media', ai: 'Agent', maps: 'Maps', documents: 'Documents', current: 'Current',
  notes: 'Notes', databases: 'Databases', logs: 'Logs', settings: 'Settings', about: 'About',
  dashboards: 'Dashboards'
};

// ── Module-level loading spinner
function TabSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: '1rem',
    }}>
      <div className="spin-ring" />
      <span style={{
        color: 'var(--text-3)', fontSize: '0.78rem',
        letterSpacing: '0.1em', fontFamily: 'var(--font-display)', fontWeight: 600,
      }}>
        LOADING MODULE
      </span>
    </div>
  );
}

// ── Tab renderer — props forwarded for legacy components that haven't migrated to Zustand yet
function renderTab(tab, user, setUser, theme, setTheme) {
  const props = { user, setUser, theme, setTheme };
  switch (tab) {
    case 'overview':       return <Overview {...props} />;
    case 'humanoid':       return <HumanoidViewer {...props} />;
    case 'physique':       return <Physique {...props} />;
    case 'assessment':     return <Assessment {...props} />;
    case 'training':       return <Training {...props} />;
    case 'strength':       return <StrengthMetrics {...props} />;
    case 'nutrition':      return <Nutrition {...props} />;
    case 'hydration':      return <HydrationTracker {...props} />;
    case 'sleep':          return <SleepDashboard {...props} />;
    case 'lifestyle':      return <Lifestyle {...props} />;
    case 'mind':           return <MindWellness {...props} />;
    case 'medical':        return <Medical {...props} />;
    case 'progress':       return <Progress {...props} />;
    case 'goals':          return <GoalsDashboard {...props} />;
    case 'analytics':      return <Analytics {...props} />;
    case 'settings':       return <ProfileEditor {...props} />;
    case 'skills':         return <Skills {...props} />;
    case 'health':         return <HealthExtras {...props} />;
    case 'shopping':       return <Shopping />;          // now reads from Zustand directly
    case 'tasks':          return <Tasks {...props} />;
    case 'projects':       return <Projects />;
    case 'portfolio':      return <Portfolio />;
    case 'calendar':       return <Calendar />;
    case 'timesheet':      return <Timesheet />;
    case 'logs':           return <Logs />;
    case 'finance':        return <Finance />;           // now reads from Zustand directly
    case 'entertainment':  return <Entertainment />;     // now reads from Zustand directly
    case 'social':         return <SocialMedia />;
    case 'ai':             return <AiDashboard />;
    case 'maps':           return <Maps />;
    case 'documents':      return <Documents />;
    case 'current':        return <Current />;
    case 'notes':          return <Notes />;
    case 'databases':      return <Databases />;
    case 'dashboards':     return <Dashboards />;
    case 'about':          return <About {...props} />;
    case 'apps':           return <AppLauncher setActiveTab={useStore.getState().setActiveTab} />;
    default:               return <Overview {...props} />;
  }
}

// ── Floating Pill Navigation
function FloatingNav({ activeTab, setActiveTab, navItems }) {
  const scrollRef = React.useRef(null);

  useEffect(() => {
    const activeEl = scrollRef.current?.querySelector('.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  return (
    <nav className="nav-container" role="navigation" aria-label="Main navigation">
      <div className="nav-track" ref={scrollRef}>
        {navItems.map((item) => (
          <button
            key={item.id}
            title={item.label}
            className={`nav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <span className="nav-icon-wrap">
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ── Root App — reads from Zustand store (no more prop-drilled useLocalStorage)
export default function App() {
  const user      = useStore(selectUser);
  const setUser   = useStore(selectSetUser);
  const theme     = useStore(selectTheme);
  const palette   = useStore(selectPalette);
  const setTheme  = useStore(selectSetTheme);
  const setPalette = useStore(selectSetPalette);
  const activeTab  = useStore(selectActiveTab);
  const setActiveTab = useStore(selectSetActiveTab);
  const pinnedTabs = useStore((state) => state.pinnedTabs);
  const fetchInitialData = useStore(selectFetchInitialData);

  // Generate the floating nav dynamically based on pinned tabs
  const navItems = pinnedTabs.map(id => ({ id, label: GLOBAL_MODULES[id] || id }));
  navItems.push({ id: 'apps', label: 'App Hub' }); // Always keep App Hub at the end

  // useEffect(() => useVascularitySync(), []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Apply theme/palette as data attributes on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-palette', palette);
  }, [theme, palette]);

  return (
    <ToastProvider>
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
            <ErrorBoundary resetKey={activeTab}>
              <Suspense fallback={<TabSpinner />}>
                {renderTab(activeTab, user, setUser, theme, setTheme)}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        <FloatingNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          navItems={navItems}
        />
      </div>
    </ToastProvider>
  );
}
