import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import lazy from './app/lazyPage';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/app-styles.css';
import { FEATURE_BY_ID, FEATURE_GROUPS as TAB_GROUP_MAP, featurePath, resolveFeatureRoute } from './config/featureRegistry';
import useRoutePreload from './app/useRoutePreload';
import { getTextDirection } from './utils/userFormatters';
import useDesignPreferences from './hooks/useDesignPreferences';
import usePlayfulMotion from './hooks/usePlayfulMotion';
import PageTransition from './components/motion/PageTransition';
import { useKinetic } from './components/motion/KineticContext';
import LoadingSkeleton from './components/ui/LoadingSkeleton';
import { TIMING } from './constants';
import { logPageView } from './lib/logger';
import useNotifications from './hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { listDrafts, removeOwnerDrafts } from './lib/drafts';
import { userDateKey } from './utils/calendarDate';

// Anonymous entry pages do not need the authenticated workspace controls.
const ToastProvider = lazy(() => import('./hooks/useToast').then(module => ({ default: module.ToastProvider })));
const WorkspaceChapter = lazy(() => import('./components/motion/WorkspaceChapter'));
const WorkspaceSubnav = lazy(() => import('./components/WorkspaceSubnav'));
const SignOutDialog = lazy(() => import('./components/SignOutDialog'));
const PageHeader = lazy(() => import('./components/ui/PageHeader'));
const PageState = lazy(() => import('./components/ui/PageState'));
const NotFound = lazy(() => import('./components/NotFound'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const FloatingPillDock = lazy(() => import('./components/FloatingPillDock'));
const PremiumSidebar = lazy(() => import('./components/PremiumSidebar'));
const Header = lazy(() => import('./components/Header'));

const MODULE_COMPONENTS = {
  overview: lazy(() => import('./components/Overview')),
  assessment: lazy(() => import('./components/Assessment')),
  medical: lazy(() => import('./components/Medical')),
  physique: lazy(() => import('./components/Physique')),
  training: lazy(() => import('./components/Training')),
  lifestyle: lazy(() => import('./components/Lifestyle')),
  nutrition: lazy(() => import('./components/Nutrition')),
  goals: lazy(() => import('./components/GoalsDashboard')),
  mind: lazy(() => import('./components/MindWellness')),
  hydration: lazy(() => import('./components/HydrationTracker')),
  strength: lazy(() => import('./components/StrengthMetrics')),
  profile: lazy(() => import('./components/ProfileEditor')),
  skills: lazy(() => import('./components/Skills')),
  health: lazy(() => import('./components/HealthExtras')),
  shopping: lazy(() => import('./components/Shopping')),
  tasks: lazy(() => import('./components/Tasks')),
  entertainment: lazy(() => import('./components/Entertainment')),
  calendar: lazy(() => import('./components/Calendar')),
  timesheet: lazy(() => import('./components/Timesheet')),
  logs: lazy(() => import('./components/Logs')),
  help: lazy(() => import('./components/Helpdesk')),
  wellness: lazy(() => import('./components/WellnessCommand')),
  life: lazy(() => import('./components/LifeCommand')),
  hub: lazy(() => import('./components/HubCommand')),
  workspace: lazy(() => import('./components/WorkspaceHub')),
  portfolio: lazy(() => import('./components/Portfolio')),
  projects: lazy(() => import('./components/Projects')),
  databases: lazy(() => import('./components/Databases')),
  social: lazy(() => import('./components/SocialMedia')),
  ai: lazy(() => import('./components/AiDashboard')),
  maps: lazy(() => import('./components/Maps')),
  documents: lazy(() => import('./components/Documents')),
  current: lazy(() => import('./components/Current')),
  notes: lazy(() => import('./app/NotesRoute')),
  apps: lazy(() => import('./components/AppLauncher')),
  finsync: lazy(() => import('./components/UnifiedWorkspace')),
  oxfin: lazy(() => import('./components/UnifiedWorkspace')),
  equity: lazy(() => import('./domains/equity/EquityPage')),
  forex: lazy(() => import('./domains/forex/ForexPage')),
  family: lazy(() => import('./domains/family/FamilyPage')),
  companion: lazy(() => import('./components/UnifiedWorkspace')),
  about: lazy(() => import('./components/About')),
  sip: lazy(() => import('./components/SIPCalculator')),
  habits: lazy(() => import('./components/HabitsMatrix')),
  pricing: lazy(() => import('./components/Pricing')),
  actions: lazy(() => import('./components/ActionCenter')),
  sleep: lazy(() => import('./components/SleepDashboard')),
  notifications: lazy(() => import('./components/NotificationCenter')),
};
const Finance = lazy(() => import('./components/Finance'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
function LoginEntry(props) { return <Suspense fallback={<LoadingSkeleton />}><LoginPage {...props} /></Suspense>; }
const LegacyWorkspaceStyles = lazy(() => import('./app/LegacyWorkspaceStyles'));
const CLASSIC_TOOLS = new Set(['sleep', 'lifestyle', 'mind', 'medical', 'health', 'habits', 'assessment', 'training', 'strength', 'nutrition', 'hydration', 'skills', 'goals', 'portfolio', 'shopping', 'tasks', 'projects', 'social', 'entertainment', 'databases', 'logs', 'profile', 'timesheet', 'documents', 'current']);
const CustomerAdminPage = lazy(() => import('./domains/customer-admin/CustomerAdminPage'));
const InsightsHub = lazy(() => import('./components/InsightsHub'));
const InsightsMotion = lazy(() => import('./domains/insights/InsightsMotion'));
const HubPresentation = lazy(() => import('./domains/hub/HubPresentation'));
const LifePresentation = lazy(() => import('./domains/life/LifePresentation'));
const ModulePresentation = lazy(() => import('./components/motion/ModulePresentation'));
const FloatingCompanion = lazy(() => import('./components/motion/FloatingCompanion'));
const PRESENTATIONS = { insights: InsightsMotion, hub: HubPresentation, life: LifePresentation, finance: ModulePresentation, wellness: ModulePresentation, workspace: ModulePresentation };
const UnifiedWorkspace = lazy(() => import('./components/UnifiedWorkspace'));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const DailyCheckIn = lazy(() => import('./components/DailyCheckIn'));
const PUBLIC_PAGES = {
  '/welcome': lazy(() => import('./pages/LandingPage')),
  '/privacy': lazy(() => import('./pages/PrivacyPage')),
  '/terms': lazy(() => import('./pages/TermsPage')),
};
const FINANCE_VIEWS = { finance: 'Overview', transactions: 'Transactions', financeAnalytics: 'Analytics', financeTrends: 'Trends', budgeting: 'Budgeting', subscriptions: 'Subscriptions', financeSync: 'Sync' };

function preloadFeature(id) {
  const Page = FINANCE_VIEWS[id] ? Finance
    : ['analytics', 'dashboards', 'forecast', 'progress'].includes(id) ? InsightsHub
    : ['customers', 'finsync', 'oxfin'].includes(id) ? CustomerAdminPage
    : MODULE_COMPONENTS[id];
  return Promise.all([
    Page?.preload().then(module => module.default.preloadTab?.(FINANCE_VIEWS[id] || id)),
    PRESENTATIONS[FEATURE_BY_ID[id]?.area]?.preload(),
    CLASSIC_TOOLS.has(id) ? LegacyWorkspaceStyles.preload() : undefined,
  ]);
}

function ModulePage(props) {
  const page = <ModuleContent {...props} />;
  const Presentation = PRESENTATIONS[props.feature.area];
  return Presentation ? <Presentation area={props.feature.area} page={props.feature.id} view={props.view}>{page}</Presentation> : page;
}

function ModuleContent({ feature, view, user, theme, setActiveTab, notificationState, onOpenCheckIn, onDismissCheckIn, checkInAvailable }) {
  if (FINANCE_VIEWS[feature.id]) return <Finance initialTab={FINANCE_VIEWS[feature.id]} />;
  if (['analytics', 'dashboards', 'forecast', 'progress'].includes(feature.id)) return <InsightsHub initialTab={feature.id} logs={useStore.getState().metric_logs} />;
  if (['customers', 'finsync', 'oxfin'].includes(feature.id)) return <CustomerAdminPage product={feature.id === 'customers' ? undefined : feature.id} />;
  if (['equity', 'forex', 'family'].includes(feature.id)) {
    const NativePage = MODULE_COMPONENTS[feature.id];
    return <NativePage view={view || undefined} onViewChange={next => setActiveTab(feature.id, next)} />;
  }
  if (feature.id === 'companion') {
    if (['equity', 'forex', 'family'].includes(view)) return <Navigate to={featurePath(view)} replace />;
    return <UnifiedWorkspace defaultApp={['finsync', 'oxfin'].includes(view) ? view : 'matrix'} onNavigate={setActiveTab} />;
  }
  if (feature.id === 'healthSync') return <section className="module-page"><PageHeader accent="Wellness" title="Health Sync" subtitle="Review supported health sources and connection requirements." /><PageState state="setup" title="Pair a health companion" description="Health imports require an authorized iOS or Android companion. No simulated readings are written. Device pairing is not configured in this deployment." /></section>;
  const Component = MODULE_COMPONENTS[feature.id];
  const page = Component ? <Component {...(feature.id === 'notes' ? { view: view || 'all', onViewChange: next => setActiveTab('notes', next) } : {})} user={user} setUser={useStore.getState().setUser} theme={theme} setTheme={useStore.getState().setTheme} setActiveTab={setActiveTab} onNavigate={setActiveTab} notificationState={notificationState} onOpenCheckIn={onOpenCheckIn} onDismissCheckIn={onDismissCheckIn} checkInAvailable={checkInAvailable} /> : <NotFound />;
  return CLASSIC_TOOLS.has(feature.id) ? <LegacyWorkspaceStyles>{page}</LegacyWorkspaceStyles> : page;
}

export default function App() {
  const pageRef = useRef(null);
  const { canAnimate } = usePlayfulMotion();
  const { session, loading: authLoading, signOut, user: authenticatedUser } = useAuth();
  const user = useStore(state => state.user);
  const palette = useStore(state => state.palette);
  const storeActiveTab = useStore(state => state.activeTab);
  const storeSetActiveTab = useStore(state => state.setActiveTab);
  const sidebarCollapsed = useStore(state => state.sidebarCollapsed);
  const density = useStore(state => state.density || 'comfortable');
  const fetchInitialData = useStore(state => state.fetchInitialData);
  const resetSessionData = useStore(state => state.resetSessionData);
  const checkServerHealth = useStore(state => state.checkServerHealth);
  const isLoading = useStore(state => state.isLoading);
  const serverStatus = useStore(state => state.serverStatus);
  const initialLoadError = useStore(state => state.initialLoadError);
  const onboardingComplete = useStore(state => state.onboardingComplete);
  const lastCheckIn = useStore(state => state.lastCheckIn);
  const checkInAlertDismissedDate = useStore(state => state.checkInAlertDismissedDate);
  const setCheckInAlertDismissedDate = useStore(state => state.setCheckInAlertDismissedDate);
  const { theme, reducedMotion, uiStyle = 'kinetic', companionEnabled = true } = useDesignPreferences();
  const kinetic = useKinetic();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [loadedSessionId, setLoadedSessionId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [logoutDialog, setLogoutDialog] = useState(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [signOutOutcome, setSignOutOutcome] = useState(null);
  const logoutLock = useRef(false);
  const queryClient = useQueryClient();
  const sessionId = authenticatedUser?.id || authenticatedUser?.email || session?.expiresAt || null;
  useEffect(() => { window.dispatchEvent(new CustomEvent('growthtrack:session-changed', { detail: { owner: sessionId } })); }, [sessionId]);
  const initialDataReady = Boolean(sessionId && loadedSessionId === sessionId && !loadError && !initialLoadError);
  const notificationState = useNotifications({ enabled: Boolean(session && initialDataReady && user?.notifications !== false) });
  const navigate = useNavigate();
  const location = useLocation();
  const route = resolveFeatureRoute(location.pathname, location.search, location.hash);
  const activeTab = route.feature?.id || storeActiveTab;
  const publicPage = PUBLIC_PAGES[location.pathname];
  const preloadEvents = useRoutePreload({ ready: Boolean(session && !publicPage && initialDataReady), tier: kinetic.tier, preload: preloadFeature });
  useEffect(() => { document.documentElement.dataset.playfulMotion = String(canAnimate); }, [canAnimate]);
  const todayStr = userDateKey(user || {});
  const requestLogout = async () => {
    setLogoutError('');
    try { const drafts = await listDrafts(sessionId); setLogoutDialog({ count: drafts.length, available: true }); }
    catch { setLogoutDialog({ count: 0, available: false }); }
  };
  const confirmLogout = async (removeLocal) => {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setLogoutBusy(true); setLogoutError('');
    const ownerId = sessionId;
    try {
      const result = await signOut();
      if (result?.error) throw result.error;
      queryClient.clear();
      let outcome = 'kept';
      if (removeLocal && logoutDialog?.available && logoutDialog.count > 0) {
        try { await removeOwnerDrafts(ownerId); outcome = 'removed'; }
        catch { outcome = 'cleanup-failed'; }
      }
      setSignOutOutcome({ kind: outcome, from: location });
      setLogoutDialog(null);
    } catch {
      setLogoutError('Sign-out could not be completed. You’re still signed in and your drafts are unchanged. Try again.');
    } finally {
      logoutLock.current = false;
      setLogoutBusy(false);
    }
  };
  const setActiveTab = useCallback((id, view) => {
    storeSetActiveTab(id);
    navigate(featurePath(id, typeof view === 'string' ? view : undefined));
  }, [navigate, storeSetActiveTab]);

  // URLs own navigation. Compatibility with modules that still set activeTab is temporary.
  const previous = useRef({ location: '', tab: storeActiveTab });
  const previousFocusedRoute = useRef(null);
  useEffect(() => {
    if (!session || publicPage || !route.feature || route.redirect) return;
    const key = location.pathname + location.search + location.hash;
    const changedLocation = previous.current.location !== key;
    const changedStore = previous.current.tab !== storeActiveTab;
    previous.current = { location: key, tab: changedLocation ? route.feature.id : storeActiveTab };
    if (changedLocation || !initialDataReady) {
      if (storeActiveTab !== route.feature.id) storeSetActiveTab(route.feature.id);
    } else if (changedStore && storeActiveTab !== route.feature.id) navigate(featurePath(storeActiveTab));
    document.title = `GrowthTrack — ${route.feature.label}`;
    if (changedLocation) logPageView(route.feature.id);
  }, [location.pathname, location.search, location.hash, storeActiveTab, storeSetActiveTab, navigate, session, publicPage, route.feature, route.redirect, initialDataReady]);

  // Client-side navigation does not move browser focus. Announce the new main
  // region to keyboard and screen-reader users when the module/view changes.
  useEffect(() => {
    if (!session || publicPage || !route.feature || route.redirect) return;
    const routeKey = `${route.feature.id}:${route.view || ''}`;
    if (previousFocusedRoute.current && previousFocusedRoute.current !== routeKey) {
      const sameModule = previousFocusedRoute.current.split(':')[0] === route.feature.id;
      const tabOwnsFocus = document.activeElement?.getAttribute('role') === 'tab';
      if (!sameModule || !tabOwnsFocus) document.getElementById('main-content')?.focus({ preventScroll: true });
    }
    previousFocusedRoute.current = routeKey;
  }, [session, publicPage, route.feature, route.view, route.redirect]);

  const retryInitialLoad = useCallback(async () => {
    setLoadError(null);
    try { await fetchInitialData(); setLoadedSessionId(sessionId); }
    catch (error) { setLoadError(error); }
  }, [fetchInitialData, sessionId]);
  // Load only the selected page while its authenticated workspace request is
  // pending. Rendering and all page effects still wait for initialDataReady.
  useEffect(() => {
    if (!session || publicPage || !route.feature || route.redirect) return;
    void preloadFeature(route.feature.id)?.catch(() => {});
  }, [session, publicPage, route.feature, route.redirect]);
  useEffect(() => {
    queryClient.clear();
    resetSessionData();
    setLoadedSessionId(null);
    setLoadError(null);
    if (sessionId) setSignOutOutcome(null);
  }, [sessionId, resetSessionData, queryClient]);
  useEffect(() => {
    if (!session || publicPage) return undefined;
    let disposed = false;
    let readyTimer;
    setLoadError(null);
    fetchInitialData().then(() => {
      // Give the snapshot's shell update its own task before committing the selected page.
      // This keeps one large startup commit from blocking input; no fixed loading delay is added.
      if (!disposed) readyTimer = setTimeout(() => { if (!disposed) setLoadedSessionId(sessionId); }, 0);
    }).catch(error => { if (!disposed) setLoadError(error); });
    void checkServerHealth();
    const interval = setInterval(checkServerHealth, TIMING.SERVER_HEALTH_POLL_MS);
    return () => { disposed = true; clearTimeout(readyTimer); clearInterval(interval); };
  }, [session, sessionId, publicPage, fetchInitialData, checkServerHealth]);
  const textDirection = getTextDirection(user);
  useEffect(() => { document.documentElement.setAttribute('dir', textDirection); }, [textDirection]);
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [activeTab]);

  if (publicPage) { const PublicPage = publicPage; return <Suspense fallback={<LoadingSkeleton />}><PublicPage /></Suspense>; }
  // Public pages can paint while session verification is pending. Protected
  // routes and their data effects still require the verified session above.
  if (authLoading) return location.pathname === '/login' ? <LoginEntry theme={theme} palette={palette} signingOut={logoutBusy} /> : <LoadingSkeleton />;
  if (!session && location.pathname === '/') return <Navigate to="/welcome" replace />;
  if (!session && logoutBusy) return <LoginEntry theme={theme} palette={palette} signingOut />;
  if (!session) return location.pathname === '/login' ? <LoginEntry theme={theme} palette={palette} signOutNotice={signOutOutcome?.kind} /> : <Navigate to="/login" replace state={{ from: signOutOutcome?.from || location, signedOut: signOutOutcome?.kind }} />;
  if (location.pathname === '/login' || location.pathname === '/') return <Navigate to={featurePath('overview')} replace />;
  if (route.redirect) return <Navigate to={route.redirect} replace />;

  const group = TAB_GROUP_MAP[activeTab] || 'system';
  return <ErrorBoundary resetKey="root"><Suspense fallback={<LoadingSkeleton variant={group} />}><ToastProvider>
    <SignOutDialog open={Boolean(logoutDialog)} drafts={logoutDialog} busy={logoutBusy} error={logoutError} onCancel={() => { if (!logoutBusy) setLogoutDialog(null); }} onConfirm={confirmLogout} />
    <CommandPalette />
    <Suspense fallback={null}>
      {initialDataReady && !isLoading && !onboardingComplete && <OnboardingWizard />}
      {showCheckIn && onboardingComplete && <DailyCheckIn onClose={() => setShowCheckIn(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </Suspense>
    <div className="app-shell" dir={textDirection} data-theme={theme} data-palette={palette} data-density={density} data-reduced-motion={String(reducedMotion)} data-playful-motion={String(canAnimate)} data-active-tab={activeTab} data-sidebar-collapsed={sidebarCollapsed} data-ui-system="editorial" data-ui-style={uiStyle} data-design-revision={uiStyle === 'kinetic' ? 'kinetic-workspace-v4' : 'character-workspace-v3'} data-domain={group}>
      <a className="skip-to-content" href="#main-content">Skip to content</a>
      <div className="main-area" {...preloadEvents}>
        <Header activeTab={activeTab} setActiveTab={setActiveTab} user={user} theme={theme} setTheme={useStore.getState().setTheme} serverStatus={serverStatus} unreadCount={notificationState.unreadCount} onOpenSettings={() => setShowSettings(true)} onOpenNotifications={() => setActiveTab('notifications')} />
        <main ref={pageRef} id="main-content" className="content-area" tabIndex={-1} aria-busy={isLoading} data-page-template={route.feature?.template}>
          <WorkspaceChapter activeTab={activeTab} />
          <WorkspaceSubnav activeTab={activeTab} />
          {serverStatus === 'offline' && <PageState state="offline" title="Server unavailable" description="Previously loaded records may be visible. Saving requires a connection; unfinished entries are not automatically submitted." onRetry={checkServerHealth} />}
          <ErrorBoundary resetKey={activeTab}><Suspense fallback={<LoadingSkeleton variant={group} />}>
            {!route.feature ? <NotFound /> : loadError || initialLoadError ? <PageState state="error" title="Your records could not be loaded" description="This is a connection or server error, not an empty account. Retry before making changes." onRetry={retryInitialLoad} /> : isLoading || !initialDataReady ? <LoadingSkeleton variant={group} /> : <PageTransition pageKey={activeTab}><ModulePage key={activeTab} feature={route.feature} view={route.view} user={user} theme={theme} setActiveTab={setActiveTab} notificationState={notificationState} onOpenCheckIn={() => setShowCheckIn(true)} onDismissCheckIn={() => setCheckInAlertDismissedDate(todayStr)} checkInAvailable={onboardingComplete && lastCheckIn !== todayStr && checkInAlertDismissedDate !== todayStr} /></PageTransition>}
          </Suspense></ErrorBoundary>
        </main>
        <PremiumSidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onOpenSettings={() => setShowSettings(true)} onLogout={requestLogout} />
        <FloatingPillDock activeTab={activeTab} onTabChange={setActiveTab} />
        {initialDataReady && companionEnabled && <ErrorBoundary resetKey={activeTab} fallback={<></>}><Suspense fallback={null}><FloatingCompanion /></Suspense></ErrorBoundary>}
      </div>
    </div>
  </ToastProvider></Suspense></ErrorBoundary>;
}
