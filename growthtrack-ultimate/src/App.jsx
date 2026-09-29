import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/app-styles.css';
import { TAB_GROUP_MAP } from './config/navigation';
import { featurePath, resolveFeatureRoute } from './config/featureRegistry';
import { getTextDirection } from './utils/userFormatters';
import useDesignPreferences from './hooks/useDesignPreferences';
import LoginPage from './pages/LoginPage';
import CommandPalette from './components/CommandPalette';
import FloatingPillDock from './components/FloatingPillDock';
import PremiumSidebar from './components/PremiumSidebar';
import Header from './components/Header';
import LoadingSkeleton from './components/ui/LoadingSkeleton';
import PageState from './components/ui/PageState';
import NotFound from './components/NotFound';
import { TIMING } from './constants';
import { logPageView } from './lib/logger';
import useNotifications from './hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import Modal from './components/ui/Modal';
import { listDrafts, removeOwnerDrafts } from './lib/drafts';
import { financeToday } from './utils/financeModel';

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
  notes: lazy(() => import('./components/Notes')),
  apps: lazy(() => import('./components/AppLauncher')),
  about: lazy(() => import('./components/About')),
  sip: lazy(() => import('./components/SIPCalculator')),
  habits: lazy(() => import('./components/HabitsMatrix')),
  pricing: lazy(() => import('./components/Pricing')),
  actions: lazy(() => import('./components/ActionCenter')),
  sleep: lazy(() => import('./components/SleepDashboard')),
  notifications: lazy(() => import('./components/NotificationCenter')),
};
const Finance = lazy(() => import('./components/Finance'));
const InsightsHub = lazy(() => import('./components/InsightsHub'));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const DailyCheckIn = lazy(() => import('./components/DailyCheckIn'));
const PUBLIC_PAGES = {
  '/welcome': lazy(() => import('./pages/LandingPage')),
  '/privacy': lazy(() => import('./pages/PrivacyPage')),
  '/terms': lazy(() => import('./pages/TermsPage')),
};
const FINANCE_VIEWS = { finance: 'Overview', transactions: 'Transactions', financeAnalytics: 'Analytics', financeTrends: 'Trends', budgeting: 'Budgeting', subscriptions: 'Subscriptions', financeSync: 'Sync' };

function ModulePage({ feature, user, theme, setActiveTab, notificationState, onOpenCheckIn, onDismissCheckIn, checkInAvailable }) {
  if (FINANCE_VIEWS[feature.id]) return <Finance initialTab={FINANCE_VIEWS[feature.id]} />;
  if (['analytics', 'dashboards', 'forecast', 'progress'].includes(feature.id)) return <InsightsHub initialTab={feature.id} logs={useStore.getState().metric_logs} />;
  if (feature.id === 'healthSync') return <PageState state="setup" title="Pair a health companion" description="Health imports require an authorized iOS or Android companion. No simulated readings are written. Device pairing is not configured in this deployment." />;
  const Component = MODULE_COMPONENTS[feature.id];
  return Component ? <Component user={user} setUser={useStore.getState().setUser} theme={theme} setTheme={useStore.getState().setTheme} setActiveTab={setActiveTab} onNavigate={setActiveTab} notificationState={notificationState} onOpenCheckIn={onOpenCheckIn} onDismissCheckIn={onDismissCheckIn} checkInAvailable={checkInAvailable} /> : <NotFound />;
}

export default function App() {
  const { session, signOut, user: authenticatedUser } = useAuth();
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
  const { theme, reducedMotion } = useDesignPreferences();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [loadedSessionId, setLoadedSessionId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [logoutDialog, setLogoutDialog] = useState(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const queryClient = useQueryClient();
  const sessionId = authenticatedUser?.id || authenticatedUser?.email || session?.expiresAt || null;
  const initialDataReady = Boolean(sessionId && loadedSessionId === sessionId && !loadError && !initialLoadError);
  const notificationState = useNotifications({ enabled: Boolean(session && initialDataReady && user?.notifications !== false) });
  const navigate = useNavigate();
  const location = useLocation();
  const route = resolveFeatureRoute(location.pathname, location.search, location.hash);
  const activeTab = route.feature?.id || storeActiveTab;
  const publicPage = PUBLIC_PAGES[location.pathname];
  const todayStr = financeToday(user || {});
  const requestLogout = async () => {
    setLogoutError('');
    try { const drafts = await listDrafts(sessionId); setLogoutDialog({ count: drafts.length, available: true }); }
    catch { setLogoutDialog({ count: 0, available: false }); }
  };
  const confirmLogout = async (removeLocal) => {
    if (logoutBusy) return;
    setLogoutBusy(true); setLogoutError('');
    const ownerId = sessionId;
    const result = await signOut();
    if (result?.error) { setLogoutError('Logout was not acknowledged. You are still signed in; your drafts are unchanged.'); setLogoutBusy(false); return; }
    queryClient.clear();
    if (removeLocal) {
      try { await removeOwnerDrafts(ownerId); }
      catch { setLogoutError('Signed out, but local draft removal failed. Sign in again to review this browser’s drafts.'); }
    }
    setLogoutBusy(false); setLogoutDialog(null);
  };
  const setActiveTab = useCallback((id, view) => {
    storeSetActiveTab(id);
    navigate(featurePath(id, typeof view === 'string' ? view : undefined));
  }, [navigate, storeSetActiveTab]);

  // URLs own navigation. Compatibility with modules that still set activeTab is temporary.
  const previous = useRef({ location: '', tab: storeActiveTab });
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

  const retryInitialLoad = useCallback(async () => {
    setLoadError(null);
    try { await fetchInitialData(); setLoadedSessionId(sessionId); }
    catch (error) { setLoadError(error); }
  }, [fetchInitialData, sessionId]);
  useEffect(() => {
    queryClient.clear();
    resetSessionData();
    setLoadedSessionId(null);
    setLoadError(null);
  }, [sessionId, resetSessionData, queryClient]);
  useEffect(() => {
    if (!session || publicPage) return undefined;
    let disposed = false;
    setLoadError(null);
    fetchInitialData().then(() => { if (!disposed) setLoadedSessionId(sessionId); }).catch(error => { if (!disposed) setLoadError(error); });
    void checkServerHealth();
    const interval = setInterval(checkServerHealth, TIMING.SERVER_HEALTH_POLL_MS);
    return () => { disposed = true; clearInterval(interval); };
  }, [session, sessionId, publicPage, fetchInitialData, checkServerHealth]);
  useEffect(() => { document.documentElement.setAttribute('dir', getTextDirection(user)); }, [user?.textDirection]);
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [activeTab]);

  if (publicPage) { const PublicPage = publicPage; return <Suspense fallback={<LoadingSkeleton />}><PublicPage /></Suspense>; }
  if (!session) return location.pathname === '/login' ? <LoginPage /> : <Navigate to="/login" replace state={{ from: location }} />;
  if (location.pathname === '/login' || location.pathname === '/') return <Navigate to={featurePath('overview')} replace />;
  if (route.redirect) return <Navigate to={route.redirect} replace />;

  const group = TAB_GROUP_MAP[activeTab] || 'system';
  return <ErrorBoundary resetKey="root"><ToastProvider>
    <Modal open={Boolean(logoutDialog)} title="Sign out and manage local drafts" onClose={() => { if (!logoutBusy) setLogoutDialog(null); }} actions={<>
      <button type="button" disabled={logoutBusy} onClick={() => setLogoutDialog(null)}>Stay signed in</button>
      <button type="button" disabled={logoutBusy} onClick={() => confirmLogout(false)}>Sign out, keep drafts</button>
      <button type="button" disabled={logoutBusy || !logoutDialog?.available} onClick={() => confirmLogout(true)}>Sign out and remove drafts</button>
    </>}>
      <p>{logoutDialog?.available ? `${logoutDialog.count} recoverable draft(s) are stored for your account in this browser.` : 'Local draft storage could not be inspected.'} They are not automatically submitted. Anyone with access to this browser profile may access local drafts; keeping them is best on a private device.</p>
      <p>Removing drafts permanently discards unfinished local entries, not saved server records.</p>
      {logoutError && <p role="alert">{logoutError}</p>}
    </Modal>
    <CommandPalette />
    <Suspense fallback={null}>
      {initialDataReady && !isLoading && !onboardingComplete && <OnboardingWizard />}
      {showCheckIn && onboardingComplete && <DailyCheckIn onClose={() => setShowCheckIn(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </Suspense>
    <div className="app-shell" dir={getTextDirection(user)} data-theme={theme} data-palette={palette} data-density={density} data-reduced-motion={String(reducedMotion)} data-active-tab={activeTab} data-sidebar-collapsed={sidebarCollapsed} data-ui-system="editorial" data-domain={group}>
      <a className="skip-to-content" href="#main-content">Skip to content</a>
      <div className="main-area">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} user={user} theme={theme} setTheme={useStore.getState().setTheme} serverStatus={serverStatus} unreadCount={notificationState.unreadCount} onOpenSettings={() => setShowSettings(true)} onOpenNotifications={() => setActiveTab('notifications')} />
        <main id="main-content" className="content-area" tabIndex={-1} aria-busy={isLoading} data-page-template={route.feature?.template}>
          {serverStatus === 'offline' && <PageState state="offline" title="Server unavailable" description="Previously loaded records may be visible. Saving requires a connection; unfinished entries are not automatically submitted." onRetry={checkServerHealth} />}
          <ErrorBoundary resetKey={activeTab}><Suspense fallback={<LoadingSkeleton variant={group} />}>
            {!route.feature ? <NotFound /> : loadError || initialLoadError ? <PageState state="error" title="Your records could not be loaded" description="This is a connection or server error, not an empty account. Retry before making changes." onRetry={retryInitialLoad} /> : isLoading || !initialDataReady ? <LoadingSkeleton variant={group} /> : <ModulePage key={activeTab} feature={route.feature} user={user} theme={theme} setActiveTab={setActiveTab} notificationState={notificationState} onOpenCheckIn={() => setShowCheckIn(true)} onDismissCheckIn={() => setCheckInAlertDismissedDate(todayStr)} checkInAvailable={onboardingComplete && lastCheckIn !== todayStr && checkInAlertDismissedDate !== todayStr} />}
          </Suspense></ErrorBoundary>
        </main>
        <PremiumSidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onOpenSettings={() => setShowSettings(true)} onLogout={requestLogout} />
        <FloatingPillDock activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  </ToastProvider></ErrorBoundary>;
}

