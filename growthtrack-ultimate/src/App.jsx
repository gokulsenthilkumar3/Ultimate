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
import './styles/chamber.css';
import './styles/premium.css';

import Landing from './components/Landing';
import AuthForms from './components/AuthForms';

import OnboardingWizard    from './components/OnboardingWizard';
import CommandPalette      from './components/CommandPalette';
import DailyCheckIn        from './components/DailyCheckIn';
import BottomNavBar        from './components/BottomNavBar';
import SettingsModal       from './components/SettingsModal';
import NotificationCenter  from './components/NotificationCenter';
import LoadingSkeleton     from './components/ui/LoadingSkeleton';
import NotFound            from './components/NotFound';

import { preloadHumanoidModel }  from './components/morphEngine/useModelLoader';
import { useVascularitySync }    from './store/use3DStore.usage';
import { TIMING, COLORS, LAYOUT, NOTIFICATION, ASSET_PATHS } from './constants';
import { GLOBAL_MODULES } from './constants/modules';
import { TAB_GROUP_MAP, GROUPS } from './components/BottomNavBar';

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
        top: 'var(--header-height, 54px)',
        left: 0,
        right: 0,
        zIndex: LAYOUT.STATUS_PILL_ZINDEX - 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '7px 16px',
        background: COLORS.ALERT_BANNER_BG,
        borderBottom: `1px solid ${COLORS.ALERT_BANNER_BORDER}`,
        backdropFilter: 'blur(8px)',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: COLORS.ALERT_BANNER_COLOR,
        letterSpacing: '0.04em',
      }}
    >
      <span>⚡ Daily Check-In pending — keep your streak alive!</span>
      <button
        onClick={onOpen}
        style={{
          background: COLORS.ALERT_BANNER_BORDER,
          border: `1px solid ${COLORS.ALERT_BANNER_BORDER}`,
          borderRadius: '8px',
          padding: '3px 12px',
          fontSize: '0.68rem',
          color: COLORS.ALERT_BANNER_COLOR,
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
          color: COLORS.ALERT_BANNER_COLOR,
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
        {navItems.map((item) => {
          if (item.isDivider) {
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: '4px', opacity: 0.6, borderLeft: '1px solid var(--border-strong)', marginLeft: '4px', paddingLeft: '12px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
              </div>
            );
          }
          return (
          <button
            key={item.id}
            title={item.label}
            className={`nav-item${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <span className="nav-icon-wrap">
              {item.badge > 0 && (
                <span className="nav-badge" style={{
                  background:  COLORS.NAV_BADGE_BG,
                  boxShadow:   `0 0 6px ${COLORS.NAV_BADGE_SHADOW}`,
                  minWidth: '16px', height: '16px', borderRadius: '99px',
                  fontSize: '0.58rem', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>{item.badge > LAYOUT.BADGE_MAX ? `${LAYOUT.BADGE_MAX}+` : item.badge}</span>
              )}
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
          );
        })}
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

    if (!isMounted.current) {
      isMounted.current = true;
      if (pathTab && GLOBAL_MODULES[pathTab] && pathTab !== storeActiveTab) {
        setActiveTab(pathTab);
        setIsNotFound(false);
      } else if (location.pathname === '/') {
        navigate(`/${storeActiveTab}`, { replace: true });
        setIsNotFound(false);
      }
    } else if (locChanged) {
      // URL drove the change (back/forward button or manual URL)
      if (pathTab && GLOBAL_MODULES[pathTab] && pathTab !== storeActiveTab) {
        setActiveTab(pathTab);
        setIsNotFound(false);
      } else if (location.pathname === '/') {
        navigate(`/${storeActiveTab}`, { replace: true });
        setIsNotFound(false);
      } else if (pathTab && !GLOBAL_MODULES[pathTab]) {
        setIsNotFound(true);
      }
    } else if (storeChanged) {
      // Store drove the change (user clicked a tab)
      if (storeActiveTab && pathTab !== storeActiveTab) {
        navigate(`/${storeActiveTab}`);
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

  const navItems = useMemo(() => {
    const items = [];
    
    GROUPS.forEach(g => {
      const gItems = pinnedTabs.filter(id => TAB_GROUP_MAP[id] === g.id);
      if (gItems.length > 0) {
        items.push({ isDivider: true, id: `div-${g.id}`, label: g.label });
        gItems.forEach(id => {
          items.push({ id, label: GLOBAL_MODULES[id] || id });
        });
      }
    });

    const ungrouped = pinnedTabs.filter(id => !TAB_GROUP_MAP[id]);
    if (ungrouped.length > 0) {
      items.push({ isDivider: true, id: 'div-other', label: 'Other' });
      ungrouped.forEach(id => {
        items.push({ id, label: GLOBAL_MODULES[id] || id });
      });
    }

    items.push({ isDivider: true, id: 'div-system', label: 'System' });
    items.push({ id: 'apps', label: 'App Hub' });
    items.push({ id: 'notifications', label: '🔔 Alerts', badge: unreadCount });
    return items;
  }, [pinnedTabs, unreadCount]);

  useEffect(() => {
    fetchInitialData();
    checkServerHealth();
    const interval = setInterval(checkServerHealth, TIMING.SERVER_HEALTH_POLL_MS);
    return () => clearInterval(interval);
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

  // ── Keyboard shortcuts: Ctrl+1–9 navigate to real nav tabs (skip dividers) ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        const tabItems = navItems.filter(item => !item.isDivider);
        const index = parseInt(e.key, 10) - 1;
        if (index < tabItems.length) {
          e.preventDefault();
          setActiveTab(tabItems[index].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navItems, setActiveTab]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme',   theme);
    document.documentElement.setAttribute('data-palette', palette);
  }, [theme, palette]);

  if (!isAuthenticated) {
    if (authView === 'landing') {
      return <Landing onJoinBeta={() => setAuthView('signup')} onLogin={() => setAuthView('login')} />;
    }
    return (
      <ToastProvider>
        <AuthForms 
          mode={authView} 
          onAuthSuccess={(userPayload) => {
            setIsAuthenticated(true);
            setUser(userPayload);
          }} 
        />
      </ToastProvider>
    );
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

        <div className="app-shell" data-theme={theme} data-palette={palette}>
          <div className="mesh-bg" />

          {/* Server status pill */}
          {serverStatus !== 'unknown' && (
            <div style={{
              position: 'fixed', top: '12px', right: '16px',
              zIndex: LAYOUT.STATUS_PILL_ZINDEX,
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '20px',
              background: serverStatus === 'online' ? COLORS.STATUS_ONLINE_BG    : 'rgba(255, 165, 0, 0.1)',
              border:    `1px solid ${serverStatus === 'online' ? COLORS.STATUS_ONLINE_BORDER : 'rgba(255, 165, 0, 0.3)'}`,
              fontSize: '0.65rem', fontWeight: 800,
              color: serverStatus === 'online' ? 'var(--success)' : 'orange',
              backdropFilter: 'blur(8px)',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: serverStatus === 'online' ? 'var(--success)' : 'orange',
                boxShadow: `0 0 8px ${serverStatus === 'online' ? 'var(--success)' : 'orange'}`,
                animation: serverStatus === 'online' ? 'pulse 2s infinite' : 'none',
                display: 'inline-block',
              }} />
              {serverStatus === 'online' ? 'API ONLINE' : 'LOCAL SAVES'}
            </div>
          )}

          {/* ── Single .main-area: header + content + both navbars ── */}
          <div className={`main-area${showCheckInAlert && onboardingComplete ? ' has-alert' : ''}`}>
            <Header
              user={user}
              theme={theme}
              setTheme={setTheme}
              palette={palette}
              setPalette={setPalette}
              onOpenSettings={() => setShowSettings(true)}
              unreadCount={unreadCount}
              onOpenNotifications={() => setActiveTab('notifications')}
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
                </Suspense>
              </ErrorBoundary>
            </main>

            {/* ── Navigation: FloatingNav on desktop, BottomNavBar on mobile ── */}
            <FloatingNav
              activeTab={activeTab}
              setActiveTab={(tab) => { setActiveTab(tab); }}
              navItems={navItems}
            />
            <BottomNavBar
              activeTab={activeTab}
              onTabChange={(tab) => { setActiveTab(tab); }}
            />
          </div>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

