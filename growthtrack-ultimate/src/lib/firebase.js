// ── Firebase Core ────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app';

// ── Firestore ─────────────────────────────────────────────────────────────────
import {
  getFirestore, collection, doc, getDocs, setDoc,
  addDoc, deleteDoc, updateDoc, query, where,
} from 'firebase/firestore';

// ── Analytics ─────────────────────────────────────────────────────────────────
import { getAnalytics, logEvent, setUserProperties } from 'firebase/analytics';

// ── Performance Monitoring ────────────────────────────────────────────────────
import { getPerformance, trace } from 'firebase/performance';

// ── Remote Config ─────────────────────────────────────────────────────────────
import {
  getRemoteConfig, fetchAndActivate, getValue,
} from 'firebase/remote-config';

// ── Firebase AI Logic (Gemini) ────────────────────────────────────────────────
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

// ── Config ────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ── Guard: skip Firebase init if env vars are missing (e.g. GitHub Pages without secrets) ──
const FIREBASE_ENABLED = Boolean(
  firebaseConfig.projectId &&
  firebaseConfig.apiKey &&
  firebaseConfig.appId
);

if (!FIREBASE_ENABLED) {
  console.warn(
    '[Firebase] Missing required env vars (VITE_FIREBASE_PROJECT_ID / API_KEY / APP_ID). ' +
    'Firebase features disabled. Add secrets to GitHub Actions to enable.'
  );
}

// ── Init ──────────────────────────────────────────────────────────────────────
export const app = FIREBASE_ENABLED ? initializeApp(firebaseConfig) : null;
export const db  = FIREBASE_ENABLED ? getFirestore(app) : null;
export const analytics = FIREBASE_ENABLED ? (() => { try { return getAnalytics(app); } catch { return null; } })() : null;
export const perf      = FIREBASE_ENABLED ? (() => { try { return getPerformance(app); } catch { return null; } })() : null;
export const USER_ID   = 'default_user';

// ── Remote Config ─────────────────────────────────────────────────────────────
export const remoteConfig = FIREBASE_ENABLED ? getRemoteConfig(app) : null;
if (remoteConfig) {
  remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
  remoteConfig.defaultConfig = {
    ai_enabled:   true,
    gemini_model: 'gemini-2.0-flash',
    app_version:  '5.0.0',
  };
}

export async function initRemoteConfig() {
  if (!remoteConfig) return;
  try {
    await fetchAndActivate(remoteConfig);
  } catch (e) {
    console.warn('[RemoteConfig] fetch failed, using defaults:', e.message);
  }
}

export function getConfig(key) {
  if (!remoteConfig) return null;
  return getValue(remoteConfig, key);
}

// ── AI (Gemini) ───────────────────────────────────────────────────────────────
const ai = FIREBASE_ENABLED ? (() => { try { return getAI(app, { backend: new GoogleAIBackend() }); } catch { return null; } })() : null;

export function getGeminiModel(modelName = 'gemini-2.0-flash') {
  if (!ai) throw new Error('[Firebase] AI not initialised — missing env vars.');
  return getGenerativeModel(ai, { model: modelName });
}

export async function askGemini(prompt, modelName = 'gemini-2.0-flash') {
  if (!ai) {
    console.warn('[Gemini] Skipped — Firebase not initialised.');
    return null;
  }
  try {
    trackEvent('ai_query', { model: modelName, prompt_length: prompt.length });
    const model  = getGeminiModel(modelName);
    const result = await model.generateContent(prompt);
    const text   = result.response.text();
    trackEvent('ai_response', { model: modelName, response_length: text.length });
    return text;
  } catch (e) {
    console.warn('[Gemini] generateContent failed:', e.message);
    throw e;
  }
}

// ── Analytics helpers ─────────────────────────────────────────────────────────
export function trackEvent(eventName, params = {}) {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, { ...params, app_version: '5.0.0' });
  } catch (e) {
    console.warn('[Analytics] logEvent failed:', e.message);
  }
}

export function trackPageView(pageName) {
  trackEvent('page_view', { page_title: pageName, page_location: window.location.href });
}

export function trackTabSwitch(tabName) {
  trackEvent('tab_switch', { tab_name: tabName });
}

export function trackUserProperties(props = {}) {
  if (!analytics) return;
  try {
    setUserProperties(analytics, props);
  } catch (e) {
    console.warn('[Analytics] setUserProperties failed:', e.message);
  }
}

// ── Performance trace helper ──────────────────────────────────────────────────
export function startTrace(traceName) {
  if (!perf) return null;
  try {
    const t = trace(perf, traceName);
    t.start();
    return t;
  } catch {
    return null;
  }
}

export function stopTrace(t) {
  try { t?.stop(); } catch { /* noop */ }
}

// ── Firestore CRUD helpers ────────────────────────────────────────────────────
export async function fsGetCollection(col) {
  if (!db) return [];
  try {
    const q    = query(collection(db, col), where('userId', '==', USER_ID));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn(`[Firestore] GET ${col}:`, e.message);
    return [];
  }
}

export async function fsAdd(col, data) {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, col), { ...data, userId: USER_ID });
    return { id: ref.id };
  } catch (e) {
    console.warn(`[Firestore] ADD ${col}:`, e.message);
    return null;
  }
}

export async function fsSet(col, id, data) {
  if (!db) return;
  try {
    await setDoc(doc(db, col, id), { ...data, userId: USER_ID }, { merge: true });
  } catch (e) {
    console.warn(`[Firestore] SET ${col}/${id}:`, e.message);
  }
}

export async function fsUpdate(col, id, data) {
  if (!db) return;
  try {
    await updateDoc(doc(db, col, id), data);
  } catch (e) {
    console.warn(`[Firestore] UPDATE ${col}/${id}:`, e.message);
  }
}

export async function fsDelete(col, id) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, col, id));
  } catch (e) {
    console.warn(`[Firestore] DELETE ${col}/${id}:`, e.message);
  }
}

export async function fsSetUser(data) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', USER_ID), data, { merge: true });
  } catch (e) {
    console.warn('[Firestore] SET user:', e.message);
  }
}

export async function fsCheckHealth() {
  if (!db) return false;
  try {
    await getDocs(query(collection(db, 'health_check'), where('userId', '==', USER_ID)));
    return true;
  } catch {
    return false;
  }
}
