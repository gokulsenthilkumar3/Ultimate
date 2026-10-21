import safeLocalStorage from '../utils/safeLocalStorage';

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
const CONSENT_KEY = 'growthtrack-analytics-consent';

let client = null;
let initializing = null;
async function initialize() {
  if (!MIXPANEL_TOKEN || getAnalyticsConsent() !== 'granted') return;
  if (client) return;
  if (!initializing) initializing = import('mixpanel-browser');
  const module = await initializing;
  if (getAnalyticsConsent() !== 'granted') return;
  if (!client) {
    client = module.default;
    client.init(MIXPANEL_TOKEN, { track_pageview: false, persistence: 'memory', disable_cookie: true, ip: false });
  }
}

/**
 * Safely track an event to Mixpanel.
 * @param {string} eventName - The name of the event
 * @param {object} properties - Additional properties to track
 */
export const trackEvent = (eventName, properties = {}) => {
  if (!client || getAnalyticsConsent() !== 'granted') return;
  try {
    const safe = Object.fromEntries(Object.entries(properties).filter(([key, value]) => ['module', 'area', 'method', 'type'].includes(key) && typeof value === 'string' && value.length < 40));
    client.track(eventName, safe);
  } catch (error) {
    console.error(`Failed to track event: ${eventName}`, error);
  }
};

export const setAnalyticsConsent = granted => {
  safeLocalStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
  if (granted) void initialize().catch(() => {});
  else { client?.opt_out_tracking(); client = null; }
  window.dispatchEvent(new CustomEvent('growthtrack:analytics-consent'));
};
export const getAnalyticsConsent = () => safeLocalStorage.getItem(CONSENT_KEY);
void initialize().catch(() => {});
