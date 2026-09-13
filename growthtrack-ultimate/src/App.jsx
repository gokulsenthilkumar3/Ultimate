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
import './styles/design-tokens.css';
import './styles/design-system.css';
import './styles/experience.css';
import { TAB_GROUP_MAP, GROUPS, tabMeta } from './config/navigation';
import { domainAccents } from './design/domainTokens';
import { getTextDirection } from './utils/userFormatters';

import LoginPage from './pages/LoginPage';

import OnboardingWizard    from './components/OnboardingWizard';
import CommandPalette      from './components/CommandPalette';
import DailyCheckIn        from './components/DailyCheckIn';
import FloatingPillDock    from './components/FloatingPillDock';
import PremiumSidebar      from './components/PremiumSidebar';
import Header              from './components/Header';
import Breadcrumbs         from './components/Breadcrumbs';
import SettingsModal       from './components/SettingsModal';
import NotificationCenter  from './components/NotificationCenter';
import LoadingSkeleton     from './components/ui/LoadingSkeleton';
import PageState           from './components/ui/PageState';
import NotFound            from './components/NotFound';

import { preloadHumanoidModel }  from './components/morphEngine/useModelLoader';
import { TIMING } from './constants';
import { GLOBAL_MODULES } from './constants/modules';
import { trackEvent } from './lib/analytics';
import { logSession, logPageView } from './lib/logger';
import { useStaggeredEntrance } from './hooks/useProductMotion';
import useNotifications from './hooks/useNotifications';

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
const WellnessCommand    = lazy(() => import('./components/WellnessCommand'));
const LifeCommand        = lazy(() => import('./components/LifeCommand'));
const HubCommand         = lazy(() => import('./components/HubCommand'));
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

// Warm the most likely next command view when the browser is idle. This keeps
// command navigation immediate without competing with the current interaction.
const IDLE_PREFETCH = Object.freeze({
  wellness: () => Promise.all([import('./components/SleepDashboard'), import('./components/HabitsMatrix')]),
  insights: () => Promise.all([import('./components/Current'), import('./components/Analytics')]),
  workspace: () => Promise.all([import('./components/Tasks'), import('./components/Notes')]),
  life: () => Promise.all([import('./components/SocialMedia'), import('./components/Entertainment')]),
  hub: () => Promise.all([import('./components/AppLauncher'), import('./components/NotificationCenter')]),
});


function TabSpinner() {
  return <LoadingSkeleton />;
}

// ── Memoized tab renderer — prevents re-creation on every App render ──────────
const TabRenderer = React.memo(function TabRenderer({ tab, user, setUser, theme, setTheme, setActiveTab, metricLogs, notificationState }) {
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
    case 'insights':       return <InsightsHub logs={metricLogs} setActiveTab={setActiveTab} />;
    case 'wellnessCommand': return <WellnessCommand user={user} setActiveTab={setActiveTab} />;
    case 'wellness': return <WellnessCommand user={user} setActiveTab={setActiveTab} />;
    case 'life':           return <LifeCommand />;
    case 'hub':            return <HubCommand setActiveTab={setActiveTab} notificationState={notificationState} />;
    case 'apps':           return <AppLauncher setActiveTab={setActiveTab} />;
    case 'notifications':  return <NotificationCenter onNavigate={setActiveTab} notificationState={notificationState} />;
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

function ProductPageTransition({ children, reducedMotion, hero = false }) {
  // The architecture contract reserves the orchestrated entrance for Overview.
  // Daily-use modules should appear immediately and respond only to actions.
  const motionScopeRef = useStaggeredEntrance({ disabled: reducedMotion || !hero });

  return (
    <div ref={motionScopeRef} className="page-transition-wrapper" data-motion-scope>
      {children}
    </div>
  );
}


export default function App() {
  const { session, signOut, user: authenticatedUser } = useAuth();
  const user         = useStore(selectUser);
  const setUser      = useStore(selectSetUser);
  const theme        = useStore(selectTheme);
  const palette      = useStore(selectPalette);
  const setTheme     = useStore(selectSetTheme);
  const storeActiveTab = useStore(selectActiveTab);
  const setActiveTab = useStore(selectSetActiveTab);
  const sidebarCollapsed = useStore((state) => state.sidebarCollapsed);
  const reducedMotion = useStore((state) => state.reducedMotion);
  const density = useStore((state) => state.density || 'comfortable');
  const fetchInitialData   = useStore(selectFetchInitialData);
  const checkServerHealth  = useStore(selectCheckServerHealth);
  const isLoading          = useStore(selectIsLoading);
  const serverStatus       = useStore(state => state.serverStatus);
  const onboardingComplete = useStore((state) => state.onboardingComplete);
  const lastCheckIn        = useStore((state) => state.lastCheckIn);
  const checkInAlertDismissedDate = useStore((state) => state.checkInAlertDismissedDate);
  const setCheckInAlertDismissedDate = useStore((state) => state.setCheckInAlertDismissedDate);
  const metricLogs         = useStore((state) => state.metric_logs);

  const [showCheckIn,       setShowCheckIn]       = React.useState(false);
  const [loadedSessionId, setLoadedSessionId] = React.useState(null);
  const [showSettings,      setShowSettings]      = React.useState(false);
  const [showCheckInAlert,  setShowCheckInAlert]  = React.useState(false);
  const sessionId = authenticatedUser?.id || authenticatedUser?.email || session?.expiresAt || null;
  const initialDataReady = Boolean(sessionId && loadedSessionId === sessionId);
  const notificationState  = useNotifications({ enabled: Boolean(session && initialDataReady && user?.notifications !== false) });

  const todayStr = new Date().toISOString().slice(0, 10);
  const navigate = useNavigate();
  const location = useLocation();

  // Use URL path as source of truth if valid, else fallback to store
  const pathTabRaw = location.pathname.replace(/^\/+|\/+$/g, '');
  const activeTab = (pathTabRaw && GLOBAL_MODULES[pathTabRaw]) ? pathTabRaw : storeActiveTab;

  useEffect(() => {
    if (reducedMotion) return undefined;
    const preload = IDLE_PREFETCH[activeTab];
    if (!preload) return undefined;
    const run = () => { void preload().catch(() => {}); };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 1800 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(run, 700);
    return () => window.clearTimeout(id);
  }, [activeTab, reducedMotion]);
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
    const pathTab = location.pathname.replace(/^\/+|\/+$/g, '');
    const locChanged = location.pathname !== prevLocationRef.current;
    const storeChanged = storeActiveTab !== prevStoreTabRef.current;
    const hashTab = location.hash.substring(1).toLowerCase();

    // Overview quick links can carry a nested Finance destination in the
    // hash. Treat that deep link as navigation even when Finance is already
    // the store's active module (a hash-only click otherwise leaves the page
    // visually on Overview).
    if (pathTab !== 'finance' && (hashTab === 'portfolio' || hashTab === 'sip')) {
      setActiveTab('finance');
      navigate(`/finance#${hashTab}`, { replace: true });
      return;
    }

    if (pathTab === 'portfolio' || pathTab === 'sip') {
      setActiveTab('finance');
      // Preserve the nested finance destination in the same history update.
      // Navigating to `/finance` first and assigning the hash afterwards races
      // Finance's initial tab read, which used to land Portfolio users on the
      // Overview tab and require a second click.
      navigate(`/finance#${pathTab}`, { replace: true });
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
  }, [location.hash, location.pathname, storeActiveTab, setActiveTab, navigate, session]);


  useEffect(() => {
    if (!session) return undefined;
    trackEvent('App Opened');
    logSession('start', 'Application opened');
    let disposed = false;
    fetchInitialData().finally(() => { if (!disposed) setLoadedSessionId(sessionId); });
    checkServerHealth();
    const interval = setInterval(checkServerHealth, TIMING.SERVER_HEALTH_POLL_MS);
    return () => {
      disposed = true;
      clearInterval(interval);
      logSession('end', 'Application closed');
    };
  }, [session, sessionId, fetchInitialData, checkServerHealth]);

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

  // Formatting & Culture is a workspace preference, so direction must apply
  // to the whole document rather than only the Profile form.
  useEffect(() => {
    document.documentElement.setAttribute('dir', getTextDirection(user));
  }, [user?.textDirection]);

  // New modules start at the top; a long previous page must not hide their heading.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

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
        {initialDataReady && !isLoading && !onboardingComplete && <OnboardingWizard />}

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

        <div className="app-shell" dir={getTextDirection(user)} data-theme={theme} data-palette={palette} data-density={density} data-active-tab={activeTab} data-sidebar-collapsed={sidebarCollapsed}
          data-domain={TAB_GROUP_MAP[activeTab] || 'system'} style={{ '--domain-accent': domainAccents[TAB_GROUP_MAP[activeTab]] || domainAccents.system }}>
          <a className="skip-to-content" href="#main-content">Skip to content</a>
          <div className="mesh-bg" />


          {/* ── Main workspace: content + navigation ── */}
          <div className="main-area">
            <Header
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              user={user}
              theme={theme}
              setTheme={setTheme}
              serverStatus={serverStatus}
              unreadCount={notificationState.unreadCount}
              onOpenSettings={() => setShowSettings(true)}
              onOpenNotifications={() => setActiveTab('notifications')}
            />
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
            {!['wellness', 'finance', 'insights', 'workspace', 'life', 'hub'].includes(activeTab) && !['life', 'system'].includes(TAB_GROUP_MAP[activeTab]) && <nav className="command-subnav" aria-label={`${GROUPS[TAB_GROUP_MAP[activeTab]]?.label || 'Command'} subtabs`}>
              {(GROUPS[TAB_GROUP_MAP[activeTab]]?.tabs || []).map(id => <button key={id} className={id === activeTab ? 'is-active' : ''} onClick={() => setActiveTab(id)}>{tabMeta(id).label}</button>)}
            </nav>}

            {/* ── Single content area: shows skeleton during load, tab after ── */}
            <main id="main-content" className="content-area" tabIndex={-1} aria-busy={isLoading}>
              {serverStatus === 'offline' && <PageState state="offline" title="You’re working offline" description="Your workspace is still here. New changes will sync when the connection returns." onRetry={checkServerHealth} />}
              {!isNotFound && <Breadcrumbs activeTab={activeTab} onNavigate={setActiveTab} />}
              <ErrorBoundary resetKey={activeTab}>
                <Suspense fallback={<TabSpinner />}>
                  <ProductPageTransition key={activeTab} reducedMotion={reducedMotion} hero={activeTab === 'overview'}>
                    {isNotFound
                      ? <NotFound />
                      : isLoading || !initialDataReady
                      ? <LoadingSkeleton variant={TAB_GROUP_MAP[activeTab] || 'workspace'} />
                      : <TabRenderer
                          tab={activeTab}
                          user={user}
                          setUser={setUser}
                          theme={theme}
                          setTheme={setTheme}
                          setActiveTab={setActiveTab}
                          metricLogs={metricLogs}
                          notificationState={['notifications', 'hub'].includes(activeTab) ? notificationState : null}
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

