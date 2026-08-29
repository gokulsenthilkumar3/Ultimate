import React, { lazy, Suspense, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import useStore, {
  selectUser, selectSetUser, selectTheme, selectPalette,
  selectSetTheme, selectActiveTab, selectSetActiveTab,
  selectFetchInitialData, selectCheckServerHealth, selectIsLoading,
} from './store/useStore';
import { useAuth } from './context/AuthContext';
import { ToastProvider }   from './hooks/useToast';
import ErrorBoundary       from './components/ErrorBoundary';
import './index.css';
import './theme-v4.css';
import './styles/chamber.css';
import './styles/premium.css';
import './styles/ui-components.css';
import './styles/ultimate-ui.css';

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
import { TIMING } from './constants';
import { GLOBAL_MODULES } from './constants/modules';
import { trackEvent } from './lib/analytics';
import { logSession, logPageView } from './lib/logger';
import { useStaggeredEntrance } from './hooks/useProductMotion';

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
const Helpdesk           = lazy(() => import('./components/Helpdesk'));
const InsightsHub        = lazy(() => import('./components/InsightsHub'));
const WorkspaceHub       = lazy(() => import('./components/WorkspaceHub'));
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
    case 'analytics':      return <InsightsHub initialTab="analytics" logs={metricLogs} />;
    case 'settings':       return <ProfileEditor {...props} />;
    case 'profile':        return <ProfileEditor {...props} />;
    case 'skills':         return <Skills {...props} />;
    case 'health':         return <HealthExtras />;
    case 'habits':         return <HabitsMatrix />;
    case 'shopping':       return <Shopping />;
    case 'tasks':          return <Tasks {...props} />;
    case 'projects':       return <Projects />;
    case 'portfolio':      return <Portfolio />;
    case 'calendar':       return <WorkspaceHub initialTab="calendar" />;
    case 'timesheet':      return <Timesheet />;
    case 'logs':           return <Logs />;
    case 'help':           return <Helpdesk />;
    case 'finance':        return <Finance />;
    case 'entertainment':  return <Entertainment />;
    case 'social':         return <SocialMedia />;
    case 'pricing':        return <Pricing />;
    case 'ai':             return <AiDashboard />;
    case 'maps':           return <Maps />;
    case 'documents':      return <WorkspaceHub initialTab="documents" />;
    case 'workspace':      return <WorkspaceHub />;
    case 'current':        return <Current />;
    case 'notes':          return <WorkspaceHub initialTab="notes" />;
    case 'databases':      return <Databases />;
    case 'dashboards':     return <InsightsHub initialTab="dashboards" logs={metricLogs} />;
    case 'about':          return <About />;
    case 'sip':            return <SIPCalculator />;
    case 'forecast':       return <InsightsHub initialTab="forecast" logs={metricLogs} />;
    case 'insights':       return <InsightsHub logs={metricLogs} />;
    case 'apps':           return <AppLauncher setActiveTab={setActiveTab} />;
    case 'notifications':  return <NotificationCenter onNavigate={setActiveTab} />;
    default:               return <Overview {...props} />;
  }
});

// ── Navbar Alert Banner ─────────────────────────────────────────────────────
function NavbarCheckInAlert({ onOpen, onDismiss }) {
  return (
    <div className="navbar-checkin-alert" role="alert" aria-live="polite">
      <span><b>⚡</b><span>Daily Check-In pending — keep your streak alive!</span></span>
      <button className="navbar-checkin-alert__action" onClick={onOpen}>CHECK IN NOW</button>
      <button className="navbar-checkin-alert__close" onClick={onDismiss} aria-label="Dismiss check-in reminder">✕</button>
    </div>
  );
}

function ProductPageTransition({ children, reducedMotion }) {
  const motionScopeRef = useStaggeredEntrance({ disabled: reducedMotion });

  return (
    <div ref={motionScopeRef} className="page-transition-wrapper" data-motion-scope>
      {children}
    </div>
  );
}


export default function App() {
  const { session, signOut } = useAuth();
  const user         = useStore(selectUser);
  const setUser      = useStore(selectSetUser);
  const theme        = useStore(selectTheme);
  const palette      = useStore(selectPalette);
  const setTheme     = useStore(selectSetTheme);
  const storeActiveTab = useStore(selectActiveTab);
  const setActiveTab = useStore(selectSetActiveTab);
  const sidebarCollapsed = useStore((state) => state.sidebarCollapsed);
  const reducedMotion = useStore((state) => state.reducedMotion);
  const fetchInitialData   = useStore(selectFetchInitialData);
  const checkServerHealth  = useStore(selectCheckServerHealth);
  const isLoading          = useStore(selectIsLoading);
  const onboardingComplete = useStore((state) => state.onboardingComplete);
  const lastCheckIn        = useStore((state) => state.lastCheckIn);
  const checkInAlertDismissedDate = useStore((state) => state.checkInAlertDismissedDate);
  const setCheckInAlertDismissedDate = useStore((state) => state.setCheckInAlertDismissedDate);
  const metricLogs         = useStore((state) => state.metric_logs);

  const [showCheckIn,       setShowCheckIn]       = React.useState(false);
  const [showSettings,      setShowSettings]      = React.useState(false);
  const [showCheckInAlert,  setShowCheckInAlert]  = React.useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const navigate = useNavigate();
  const location = useLocation();

  // Use URL path as source of truth if valid, else fallback to store
  const pathTabRaw = location.pathname.substring(1);
  const activeTab = (pathTabRaw && GLOBAL_MODULES[pathTabRaw]) ? pathTabRaw : storeActiveTab;
  const isNotFound = Boolean(pathTabRaw && !GLOBAL_MODULES[pathTabRaw]);

  // Load the large 3D asset only when its module is requested. This keeps the
  // initial dashboard path fast on lower-memory devices.
  useEffect(() => {
    if (!session || !['physique', 'humanoid'].includes(activeTab)) return;
    preloadHumanoidModel();
  }, [session, activeTab]);

  const prevLocationRef = React.useRef(location.pathname);
  const prevStoreTabRef = React.useRef(storeActiveTab);
  const isMounted = React.useRef(false);

  // ── Sync URL ↔ Store ──
  useEffect(() => {
    if (!session) return;
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
      } else if (location.pathname === '/') {
        navigate(`/${storeActiveTab}`, { replace: true });
      }
    } else if (locChanged) {
      // URL drove the change (back/forward button or manual URL)
      if (pathTab && GLOBAL_MODULES[pathTab] && pathTab !== storeActiveTab) {
        setActiveTab(pathTab);
        logPageView(pathTab);
      } else if (location.pathname === '/') {
        navigate(`/${storeActiveTab}`, { replace: true });
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
  }, [location.pathname, storeActiveTab, setActiveTab, navigate, session]);


  useEffect(() => {
    if (!session) return undefined;
    trackEvent('App Opened');
    logSession('start', 'Application opened');
    fetchInitialData();
    checkServerHealth();
    const interval = setInterval(checkServerHealth, TIMING.SERVER_HEALTH_POLL_MS);
    return () => {
      clearInterval(interval);
      logSession('end', 'Application closed');
    };
  }, [session, fetchInitialData, checkServerHealth]);

  // ── Daily Check-In alert: show slim banner (not auto-modal) ──
  useEffect(() => {
    if (onboardingComplete && lastCheckIn !== todayStr && checkInAlertDismissedDate !== todayStr) {
      const t = setTimeout(() => {
        setShowCheckInAlert(true);
      }, TIMING.DAILY_CHECKIN_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [onboardingComplete, lastCheckIn, checkInAlertDismissedDate, todayStr]);


  useEffect(() => {
    document.documentElement.setAttribute('data-theme',   theme);
    document.documentElement.setAttribute('data-palette', palette);
    document.documentElement.setAttribute('data-reduced-motion', String(reducedMotion));
  }, [theme, palette, reducedMotion]);

  if (!session) {
    return location.pathname === '/login'
      ? <LoginPage />
      : <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (location.pathname === '/login' || location.pathname === '/') {
    return <Navigate to={`/${storeActiveTab || 'overview'}`} replace />;
  }

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

        <div className="app-shell" data-theme={theme} data-palette={palette} data-active-tab={activeTab} data-sidebar-collapsed={sidebarCollapsed}>
          <div className="mesh-bg" />


          {/* ── Main workspace: content + navigation ── */}
          <div className="main-area">
            {/* ── Navbar Check-In Alert Banner ── */}
            {showCheckInAlert && onboardingComplete && lastCheckIn !== todayStr && checkInAlertDismissedDate !== todayStr && (
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
                  <ProductPageTransition key={activeTab} reducedMotion={reducedMotion}>
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
                  </ProductPageTransition>
                </Suspense>
              </ErrorBoundary>
            </main>

            {/* ── Premium Navigation UI ── */}
            <PremiumSidebar 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              user={user} 
              onOpenSettings={() => setShowSettings(true)} 
              onLogout={signOut}
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

