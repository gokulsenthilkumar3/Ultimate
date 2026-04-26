import React, { lazy, Suspense, useEffect } from 'react';
import useStore, {
  selectUser, selectSetUser, selectTheme, selectPalette,
  selectSetTheme, selectSetPalette, selectActiveTab, selectSetActiveTab,
} from './store/useStore';
import { ToastProvider } from './hooks/useToast';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import './index.css';
import './styles/chamber.css';

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
const SettingsPanel      = lazy(() => import('./components/SettingsPanel'));
const Skills             = lazy(() => import('./components/Skills'));
const HealthExtras       = lazy(() => import('./components/HealthExtras'));
const Shopping           = lazy(() => import('./components/Shopping'));
const Tasks              = lazy(() => import('./components/Tasks'));
const Finance            = lazy(() => import('./components/Finance'));
const Entertainment      = lazy(() => import('./components/Entertainment'));
const About              = lazy(() => import('./components/About'));

// ── Navigation items
const NAV_ITEMS = [
  { id: 'overview',       label: 'Overview' },
  { id: 'humanoid',       label: '3D Model', badge: 'LIVE' },
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
  { id: 'about',          label: 'About' },
];

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
    case 'settings':       return <SettingsPanel {...props} />;
    case 'skills':         return <Skills {...props} />;
    case 'health':         return <HealthExtras {...props} />;
    case 'shopping':       return <Shopping />;          // now reads from Zustand directly
    case 'tasks':          return <Tasks {...props} />;
    case 'finance':        return <Finance />;           // now reads from Zustand directly
    case 'entertainment':  return <Entertainment />;     // now reads from Zustand directly
    case 'about':          return <About {...props} />;
    default:               return <Overview {...props} />;
  }
}

// ── Floating Pill Navigation
function FloatingNav({ activeTab, setActiveTab, navItems }) {
  return (
    <nav className="nav-container" role="navigation" aria-label="Main navigation">
      <div className="nav-track">
        {navItems.map((item) => (
          <button
            key={item.id}
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
            <ErrorBoundary>
              <Suspense fallback={<TabSpinner />}>
                {renderTab(activeTab, user, setUser, theme, setTheme)}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        <FloatingNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          navItems={NAV_ITEMS}
        />
      </div>
    </ToastProvider>
  );
}
