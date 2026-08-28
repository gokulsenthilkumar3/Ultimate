import safeLocalStorage from '../utils/safeLocalStorage';
import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;

let isInitialized = false;

if (MIXPANEL_TOKEN) {
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
