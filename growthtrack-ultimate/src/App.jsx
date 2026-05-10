import React, { lazy, Suspense, useEffect } from 'react';
import useStore, {
  selectUser, selectSetUser, selectTheme, selectPalette,
  selectSetTheme, selectSetPalette, selectActiveTab, selectSetActiveTab,
  selectFetchInitialData, selectCheckServerHealth, selectServerStatus, selectIsLoading,
} from './store/useStore';
import { ToastProvider } from './hooks/useToast';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import './index.css';
import './styles/chamber.css';
import './styles/premium.css';

import OnboardingWizard from './components/OnboardingWizard';
import CommandPalette from './components/CommandPalette';
import DailyCheckIn from './components/DailyCheckIn';
import BottomNavBar from './components/BottomNavBar';
import SettingsModal from './components/SettingsModal';

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
const About              = lazy(() => import('./components/About'));
const SIPCalculator      = lazy(() => import('./components/SIPCalculator'));
const TransformationPredictor = lazy(() => import('./components/TransformationPredictor'));
const HabitsMatrix       = lazy(() => import('./components/HabitsMatrix'));

// ── Master map of all modules
export const GLOBAL_MODULES = {
  overview: 'Overview', humanoid: '3D Model', physique: 'Blueprint', assessment: 'Assessment',
  training: 'Training', nutrition: 'Nutrition', sleep: 'Sleep', lifestyle: 'Lifestyle',
  progress: 'Progress', goals: 'Goals', skills: 'Skills', health: 'Health+',
  habits: 'Habits', shopping: 'Shopping', tasks: 'Tasks', projects: 'Projects',
  portfolio: 'Portfolio', calendar: 'Calendar', timesheet: 'Timesheet', finance: 'Finance',
  entertainment: 'Entertainment', social: 'Social Media', ai: 'Agent', maps: 'Maps',
  documents: 'Documents', current: 'Current', notes: 'Notes', databases: 'Databases',
  logs: 'Logs', settings: 'Settings', dashboards: 'Dashboards', mind: 'Mind & Wellness',
  medical: 'Medical', hydration: 'Hydration', strength: 'Strength', analytics: 'Analytics',
  apps: 'App Hub', about: 'About', sip: 'SIP Calculator', forecast: 'Growth Forecast',
};

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
    case 'health':         return <HealthExtras />;
    case 'habits':         return <HabitsMatrix />;
    case 'shopping':       return <Shopping />;
    case 'tasks':          return <Tasks {...props} />;
    case 'projects':       return <Projects />;
    case 'portfolio':      return <Portfolio />;
    case 'calendar':       return <Calendar />;
    case 'timesheet':      return <Timesheet />;
    case 'logs':           return <Logs />;
    case 'finance':        return <Finance />;
    case 'entertainment':  return <Entertainment />;
    case 'social':         return <SocialMedia />;
    case 'ai':             return <AiDashboard />;
    case 'maps':           return <Maps />;
    case 'documents':      return <Documents />;
    case 'current':        return <Current />;
    case 'notes':          return <Notes />;
    case 'databases':      return <Databases />;
    case 'dashboards':     return <Dashboards />;
    case 'about':          return <About />;
    case 'sip':            return <SIPCalculator />;
    case 'forecast':       return <TransformationPredictor logs={useStore.getState().metric_logs} />;
    case 'apps':           return <AppLauncher setActiveTab={useStore.getState().setActiveTab} />;
    default:               return <Overview {...props} />;
  }
}

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

export default function App() {
  const user         = useStore(selectUser);
  const setUser      = useStore(selectSetUser);
  const theme        = useStore(selectTheme);
  const palette      = useStore(selectPalette);
  const setTheme     = useStore(selectSetTheme);
  const setPalette   = useStore(selectSetPalette);
  const activeTab    = useStore(selectActiveTab);
  const setActiveTab = useStore(selectSetActiveTab);
  const pinnedTabs   = useStore((state) => state.pinnedTabs);
  const fetchInitialData  = useStore(selectFetchInitialData);
  const checkServerHealth = useStore(selectCheckServerHealth);
  const serverStatus      = useStore(selectServerStatus);
  const isLoading         = useStore(selectIsLoading);
  const onboardingComplete = useStore((state) => state.onboardingComplete);
  const lastCheckIn        = useStore((state) => state.lastCheckIn);
  const [showCheckIn,  setShowCheckIn]  = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const navItems = pinnedTabs.map(id => ({ id, label: GLOBAL_MODULES[id] || id }));
  navItems.push({ id: 'apps', label: 'App Hub' });

  useEffect(() => {
    fetchInitialData();
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (onboardingComplete && lastCheckIn !== todayStr) {
      const t = setTimeout(() => {
        setShowCheckIn(true);
        if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Daily Check-In Reminder', {
                body: 'Time to log your daily workouts, weight, and water intake!',
                icon: '/Ultimate/favicon.ico'
              });
            }
          });
        }
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [onboardingComplete, lastCheckIn, todayStr]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index < navItems.length) {
          e.preventDefault();
          setActiveTab(navItems[index].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navItems, setActiveTab]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-palette', palette);
  }, [theme, palette]);

  return (
    <ToastProvider>
      <CommandPalette />
      {!onboardingComplete && <OnboardingWizard />}
      {showCheckIn && onboardingComplete && (
        <DailyCheckIn onClose={() => setShowCheckIn(false)} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      <div className="app-shell" data-theme={theme} data-palette={palette}>
        <div className="mesh-bg" />

        {serverStatus !== 'unknown' && (
          <div style={{
            position: 'fixed', top: '12px', right: '16px', zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px',
            background: serverStatus === 'online' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${serverStatus === 'online' ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
            fontSize: '0.65rem', fontWeight: 800,
            color: serverStatus === 'online' ? 'var(--success)' : 'var(--danger)',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: serverStatus === 'online' ? 'var(--success)' : 'var(--danger)', animation: serverStatus === 'online' ? 'pulse 2s infinite' : 'none', display: 'inline-block' }} />
            API {serverStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
          </div>
        )}

        <div className="main-area">
          <Header
            user={user}
            theme={theme}
            setTheme={setTheme}
            palette={palette}
            setPalette={setPalette}
            onOpenSettings={() => setShowSettings(true)}
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
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </ToastProvider>
  );
}
