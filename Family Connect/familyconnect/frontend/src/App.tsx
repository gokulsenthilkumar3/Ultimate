import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { useAuthStore } from './store/authStore';

// ─── Lazy-loaded pages (each route becomes its own JS chunk) ─────────────────
const LandingPage       = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const AuthPage          = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const DashboardPage     = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const TreeCanvasPage    = lazy(() => import('./pages/TreeCanvasPage').then((m) => ({ default: m.TreeCanvasPage })));
const TimelinePage      = lazy(() => import('./pages/TimelinePage').then((m) => ({ default: m.TimelinePage })));
const MediaPage         = lazy(() => import('./pages/MediaPage').then((m) => ({ default: m.MediaPage })));
const MembersPage       = lazy(() => import('./pages/MembersPage').then((m) => ({ default: m.MembersPage })));
const EventsPage        = lazy(() => import('./pages/EventsPage').then((m) => ({ default: m.EventsPage })));
const ProfilePage       = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage      = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const UltimateCallbackPage = lazy(() => import('./pages/UltimateCallbackPage').then((m) => ({ default: m.UltimateCallbackPage })));

// ─── Query client — sensible stale/cache times ───────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min
      gcTime:    1000 * 60 * 10,  // 10 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--color-saffron)] border-t-transparent" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <AppShell>{children}</AppShell>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"     element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/ultimate/callback" element={<UltimateCallbackPage />} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/tree"      element={<ProtectedRoute><TreeCanvasPage /></ProtectedRoute>} />
            <Route path="/timeline" element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
            <Route path="/media"    element={<ProtectedRoute><MediaPage /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
            <Route path="/events"  element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
            <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings"   element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
