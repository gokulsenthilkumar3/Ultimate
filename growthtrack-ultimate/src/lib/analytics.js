import safeLocalStorage from '../utils/safeLocalStorage';
import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
const CONSENT_KEY = 'growthtrack-analytics-consent';

let isInitialized = false;

const hasConsent = safeLocalStorage.getItem(CONSENT_KEY) === 'granted';
if (MIXPANEL_TOKEN && hasConsent) {
  mixpanel.init(MIXPANEL_TOKEN, {
    debug: import.meta.env.DEV,
    track_pageview: true,
    persistence: 'localStorage'
  });
  isInitialized = true;
} else {
  console.warn('Mixpanel token not found. Analytics disabled.');
}

/**
 * Safely track an event to Mixpanel.
 * @param {string} eventName - The name of the event
 * @param {object} properties - Additional properties to track
 */
export const trackEvent = (eventName, properties = {}) => {
  if (!isInitialized) return;
  try {
    mixpanel.track(eventName, properties);
  } catch (error) {
    console.error(`Failed to track event: ${eventName}`, error);
  }
};

export const setAnalyticsConsent = granted => {
  safeLocalStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
  if (granted && MIXPANEL_TOKEN && !isInitialized) {
    mixpanel.init(MIXPANEL_TOKEN, { debug: import.meta.env.DEV, track_pageview: true, persistence: 'localStorage' });
    isInitialized = true;
  }
};
export const getAnalyticsConsent = () => safeLocalStorage.getItem(CONSENT_KEY);
