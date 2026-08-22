import React, { lazy, Suspense, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import useStore, {
  selectUser, selectSetUser, selectTheme, selectPalette,
  selectSetTheme, selectSetPalette, selectActiveTab, selectSetActiveTab,
  selectFetchInitialData, selectCheckServerHealth, selectServerStatus, selectIsLoading,
} from './store/useStore';
import { ToastProvider }   from './hooks/useToast';
import ErrorBoundary       from './components/ErrorBoundary';
import Header              from './components/Header';
import './index.css';
import './theme-v4.css';
import './styles/chamber.css';
import './styles/premium.css';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

import OnboardingWizard    from './components/OnboardingWizard';
import CommandPalette      from './components/CommandPalette';
import DailyCheckIn        from './components/DailyCheckIn';
import FloatingPillDock    from './components/FloatingPillDock';
import PremiumSidebar      from './components/PremiumSidebar';
import SettingsModal       from './components/SettingsModal';
import NotificationCenter  from './components/NotificationCenter';
import LoadingSkeleton     from './components/ui/LoadingSkeleton';
import NotFound            from './components/NotFound';

import { preloadHumanoidModel }  from './components/morphEngine/useModelLoader';
import { useVascularitySync }    from './store/use3DStore.usage';
import { TIMING, COLORS, LAYOUT, NOTIFICATION, ASSET_PATHS } from './constants';
import { GLOBAL_MODULES } from './constants/modules';
import { trackEvent } from './lib/analytics';
import { logSession, logPageView } from './lib/logger';

// ── Unread notification count ──────────────────────────────────────────────
function countUnreadNotifs(user) {
  if (!user) return 0;
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  (Array.isArray(user.habits) ? user.habits : []).forEach(h => {
    const last = h.lastLog || h.last_log;
    if (!last || last < today) count++;
  });
  (Array.isArray(user.tasks?.pending) ? user.tasks.pending : []).forEach(t => {
    const due = t.dueDate || t.due_date;
    if (due && due < today) count++;
  });
  (Array.isArray(user.goals) ? user.goals : []).forEach(g => {
    if (g.status === 'completed') return;
    const dl = g.deadline || g.target_date;
    if (!dl) return;
    const daysLeft = Math.ceil((new Date(dl) - new Date(today)) / 86_400_000);
    if (daysLeft <= NOTIFICATION.GOAL_DEADLINE_WARN_DAYS) count++;
  });
  return count;
}

// ── Lazy modules ──────────────────────────────────────────────────────────────
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
const Pricing            = lazy(() => import('./components/Pricing'));


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
      }}>LOADING MODULE</span>
    </div>
  );
}

// ── Memoized tab renderer — prevents re-creation on every App render ──────────
const TabRenderer = React.memo(function TabRenderer({ tab, user, setUser, theme, setTheme, setActiveTab, metricLogs }) {
  const props = { user, setUser, theme, setTheme };
  switch (tab) {
    case 'overview':       return <Overview {...props} />;
    case 'humanoid':       // ── Merged into Physique → 3D Mirror sub-tab ──────────
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
    case 'pricing':        return <Pricing />;
    case 'ai':             return <AiDashboard />;
    case 'maps':           return <Maps />;
    case 'documents':      return <Documents />;
    case 'current':        return <Current />;
    case 'notes':          return <Notes />;
    case 'databases':      return <Databases />;
    case 'dashboards':     return <Dashboards />;
    case 'about':          return <About />;
    case 'sip':            return <SIPCalculator />;
    case 'forecast':       return <TransformationPredictor logs={metricLogs} />;
    case 'apps':           return <AppLauncher setActiveTab={setActiveTab} />;
    case 'notifications':  return <NotificationCenter onNavigate={setActiveTab} />;
    default:               return <Overview {...props} />;
  }
});

// ── Navbar Alert Banner ─────────────────────────────────────────────────────
function NavbarCheckInAlert({ onOpen, onDismiss }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '10px 20px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-card)',
        backdropFilter: 'blur(16px)',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: 'var(--text-1)',
        letterSpacing: '0.02em',
        maxWidth: 'calc(100vw - 48px)',
      }}
    >
      <span><span style={{ color: 'var(--accent)' }}>⚡</span> Daily Check-In pending — keep your streak alive!</span>
      <button
        onClick={onOpen}
        style={{
          background: 'var(--accent)',
          border: 'none',
          borderRadius: '8px',
          padding: '3px 12px',
          fontSize: '0.68rem',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 800,
          letterSpacing: '0.08em',
        }}
      >
        CHECK IN NOW
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss check-in reminder"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-3)',
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
          opacity: 0.7,
          padding: '0 4px',
        }}
      >
        ✕
      </button>
    </div>
  );
}


export default function App() {
  const user         = useStore(selectUser);
  const setUser      = useStore(selectSetUser);
  const theme        = useStore(selectTheme);
  const palette      = useStore(selectPalette);
  const setTheme     = useStore(selectSetTheme);
  const setPalette   = useStore(selectSetPalette);
  const storeActiveTab = useStore(selectActiveTab);
  const setActiveTab = useStore(selectSetActiveTab);
  const pinnedTabs   = useStore((state) => state.pinnedTabs);
  const fetchInitialData   = useStore(selectFetchInitialData);
  const checkServerHealth  = useStore(selectCheckServerHealth);
  const serverStatus       = useStore(selectServerStatus);
  const isLoading          = useStore(selectIsLoading);
  const onboardingComplete = useStore((state) => state.onboardingComplete);
  const lastCheckIn        = useStore((state) => state.lastCheckIn);
  const checkInAlertDismissedDate = useStore((state) => state.checkInAlertDismissedDate);
  const setCheckInAlertDismissedDate = useStore((state) => state.setCheckInAlertDismissedDate);
  const metricLogs         = useStore((state) => state.metric_logs);

  const [showCheckIn,       setShowCheckIn]       = React.useState(false);
  const [showSettings,      setShowSettings]      = React.useState(false);
  const [showCheckInAlert,  setShowCheckInAlert]  = React.useState(false);
  const [isNotFound,        setIsNotFound]        = React.useState(false);

  const [isAuthenticated, setIsAuthenticated] = React.useState(true); // Temp bypass for local dev
  const [authView, setAuthView] = React.useState('landing'); // 'landing', 'login', 'signup'

  const todayStr = new Date().toISOString().slice(0, 10);
  const isAuthed = Boolean(sessionStorage.getItem('growthtrack-session-token'));
  const navigate = useNavigate();
  const location = useLocation();

  // Use URL path as source of truth if valid, else fallback to store
  const pathTabRaw = location.pathname.substring(1);
  const activeTab = (pathTabRaw && GLOBAL_MODULES[pathTabRaw]) ? pathTabRaw : storeActiveTab;

  // ── Preload 3D model once on mount ──
  useEffect(() => {
    preloadHumanoidModel();
  }, []);

  const prevLocationRef = React.useRef(location.pathname);
  const prevStoreTabRef = React.useRef(storeActiveTab);
  const isMounted = React.useRef(false);

  // ── Sync URL ↔ Store ──
  useEffect(() => {
    const pathTab = location.pathname.substring(1);
    const locChanged = location.pathname !== prevLocationRef.current;
    const storeChanged = storeActiveTab !== prevStoreTabRef.current;

    if (pathTab === 'portfolio' || pathTab === 'sip') {
      setActiveTab('finance');
      window.location.hash = pathTab;
      navigate('/finance', { replace: true });
      return;
    }

    if (!isMounted.current) {
      isMounted.current = true;
      if (pathTab && GLOBAL_MODULES[pathTab] && pathTab !== storeActiveTab) {
        setActiveTab(pathTab);
        setIsNotFound(false);
      } else if (location.pathname === '/' && isAuthed) {
        navigate(`/${storeActiveTab}`, { replace: true });
        setIsNotFound(false);
      }
    } else if (locChanged) {
      // URL drove the change (back/forward button or manual URL)
      if (pathTab && GLOBAL_MODULES[pathTab] && pathTab !== storeActiveTab) {
        setActiveTab(pathTab);
        setIsNotFound(false);
        logPageView(pathTab);
      } else if (location.pathname === '/' && isAuthed) {
        navigate(`/${storeActiveTab}`, { replace: true });
        setIsNotFound(false);
      } else if (pathTab && !GLOBAL_MODULES[pathTab]) {
        setIsNotFound(true);
      }
    } else if (storeChanged) {
      // Store drove the change (user clicked a tab)
      if (storeActiveTab && pathTab !== storeActiveTab) {
        navigate(`/${storeActiveTab}`);
        logPageView(storeActiveTab);
      }
    }

    prevLocationRef.current = location.pathname;
    prevStoreTabRef.current = storeActiveTab;

    // Document title
    const moduleName = GLOBAL_MODULES[storeActiveTab];
    if (moduleName) document.title = `GrowthTrack — ${moduleName}`;
    else document.title = 'GrowthTrack Ultimate';
  }, [location.pathname, storeActiveTab, setActiveTab, navigate]);

  const unreadCount = useMemo(() => countUnreadNotifs(user), [user]);


  useEffect(() => {
    trackEvent('App Opened');
    logSession('start', 'Application opened');
    fetchInitialData();
    checkServerHealth();
    const interval = setInterval(checkServerHealth, TIMING.SERVER_HEALTH_POLL_MS);
    return () => {
      clearInterval(interval);
      logSession('end', 'Application closed');
    };
  }, []);

  // ── Daily Check-In alert: show slim banner (not auto-modal) ──
  useEffect(() => {
    if (onboardingComplete && lastCheckIn !== todayStr && checkInAlertDismissedDate !== todayStr) {
      const t = setTimeout(() => {
        setShowCheckInAlert(true);
        if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Daily Check-In', {
                body: "It's time for your daily review.",
                icon: ASSET_PATHS.FAVICON,
              });
            }
          });
        }
      }, TIMING.DAILY_CHECKIN_DELAY_MS);
      return () => clearTimeout(t);
    } else {
      setShowCheckInAlert(false);
    }
  }, [onboardingComplete, lastCheckIn, checkInAlertDismissedDate, todayStr]);


  useEffect(() => {
    document.documentElement.setAttribute('data-theme',   theme);
    document.documentElement.setAttribute('data-palette', palette);
  }, [theme, palette]);

  if (location.pathname === '/login') return <LoginPage />;
  if (location.pathname === '/' && !isAuthed) return <LandingPage />;

  return (
    <ErrorBoundary resetKey="root">
      <ToastProvider>
        <CommandPalette />

        {/* Onboarding — only when not yet completed */}
        {!onboardingComplete && <OnboardingWizard />}

        {/* Daily Check-In modal */}
        {showCheckIn && onboardingComplete && (
          <DailyCheckIn onClose={() => {
            setShowCheckIn(false);
            setShowCheckInAlert(false);
          }} />
        )}

        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}

        <div className="app-shell" data-theme={theme} data-palette={palette}>
          <div className="mesh-bg" />


          {/* ── Single .main-area: header + content + both navbars ── */}
          <div className="main-area">
            <Header
              user={user}
              theme={theme}
              setTheme={setTheme}
              palette={palette}
              setPalette={setPalette}
              onOpenSettings={() => setShowSettings(true)}
              unreadCount={unreadCount}
              onOpenNotifications={() => setActiveTab('notifications')}
              serverStatus={serverStatus}
            />

            {/* ── Navbar Check-In Alert Banner ── */}
            {showCheckInAlert && onboardingComplete && (
              <NavbarCheckInAlert
                onOpen={() => {
                  setShowCheckIn(true);
                  setShowCheckInAlert(false);
                }}
                onDismiss={() => {
                  setShowCheckInAlert(false);
                  setCheckInAlertDismissedDate(todayStr);
                }}
              />
            )}

            {/* ── Single content area: shows skeleton during load, tab after ── */}
            <main className="content-area">
              <ErrorBoundary resetKey={activeTab}>
                <Suspense fallback={<TabSpinner />}>
                  <div key={activeTab} className="page-transition-wrapper">
                    {isNotFound
                      ? <NotFound />
                      : isLoading
                      ? <LoadingSkeleton />
                      : <TabRenderer
                          tab={activeTab}
                          user={user}
                          setUser={setUser}
                          theme={theme}
                          setTheme={setTheme}
                          setActiveTab={setActiveTab}
                          metricLogs={metricLogs}
                        />
                    }
                  </div>
                </Suspense>
              </ErrorBoundary>
            </main>

            {/* ── Premium Navigation UI ── */}
            <PremiumSidebar 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              user={user} 
              onOpenSettings={() => setShowSettings(true)} 
            />
            <FloatingPillDock 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />
          </div>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

