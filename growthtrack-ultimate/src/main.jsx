import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext.jsx'
import ConsentBanner from './components/ConsentBanner.jsx';
import { getAnalyticsConsent } from './lib/analytics';

let monitoring;
async function applyMonitoringConsent() {
  if (!import.meta.env.VITE_SENTRY_DSN || getAnalyticsConsent() !== 'granted') {
    if (monitoring) await monitoring.close();
    return;
  }
  monitoring = await import('@sentry/react');
  if (getAnalyticsConsent() !== 'granted') return;
  monitoring.init({
    dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE,
    tracesSampleRate: 0, sendDefaultPii: false,
    beforeSend(event) {
      if (getAnalyticsConsent() !== 'granted') return null;
      delete event.user; delete event.request; delete event.breadcrumbs; delete event.extra; delete event.contexts;
      if (event.exception?.values) event.exception.values.forEach(value => { value.value = '[redacted]'; });
      event.message = event.message ? '[redacted]' : undefined;
      return event;
    },
  });
}
void applyMonitoringConsent();
window.addEventListener('growthtrack:analytics-consent', () => { void applyMonitoringConsent(); });
if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (attempt, error) => error?.status !== 401 && error?.status !== 403 && attempt < 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <App /><ConsentBanner />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
