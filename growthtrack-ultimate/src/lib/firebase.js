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

// ── Init ──────────────────────────────────────────────────────────────────────
export const app        = initializeApp(firebaseConfig);
export const db         = getFirestore(app);
export const analytics  = getAnalytics(app);
export const perf       = getPerformance(app);
export const USER_ID    = 'default_user';

// ── Remote Config ─────────────────────────────────────────────────────────────
export const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hr cache
remoteConfig.defaultConfig = {
  ai_enabled:   true,
  gemini_model: 'gemini-2.0-flash',
  app_version:  '5.0.0',
};

export async function initRemoteConfig() {
  try {
    await fetchAndActivate(remoteConfig);
  } catch (e) {
    console.warn('[RemoteConfig] fetch failed, using defaults:', e.message);
  }
}

export function getConfig(key) {
  return getValue(remoteConfig, key);
}

// ── AI (Gemini) ───────────────────────────────────────────────────────────────
const ai = getAI(app, { backend: new GoogleAIBackend() });

export function getGeminiModel(modelName = 'gemini-2.0-flash') {
  return getGenerativeModel(ai, { model: modelName });
}

export async function askGemini(prompt, modelName = 'gemini-2.0-flash') {
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
  try {
    setUserProperties(analytics, props);
  } catch (e) {
    console.warn('[Analytics] setUserProperties failed:', e.message);
  }
}

// ── Performance trace helper ──────────────────────────────────────────────────
export function startTrace(traceName) {
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
  try {
    const ref = await addDoc(collection(db, col), { ...data, userId: USER_ID });
    return { id: ref.id };
  } catch (e) {
    console.warn(`[Firestore] ADD ${col}:`, e.message);
    return null;
  }
}

export async function fsSet(col, id, data) {
  try {
    await setDoc(doc(db, col, id), { ...data, userId: USER_ID }, { merge: true });
  } catch (e) {
    console.warn(`[Firestore] SET ${col}/${id}:`, e.message);
  }
}

export async function fsUpdate(col, id, data) {
  try {
    await updateDoc(doc(db, col, id), data);
  } catch (e) {
    console.warn(`[Firestore] UPDATE ${col}/${id}:`, e.message);
  }
}

export async function fsDelete(col, id) {
  try {
    await deleteDoc(doc(db, col, id));
  } catch (e) {
    console.warn(`[Firestore] DELETE ${col}/${id}:`, e.message);
  }
}

export async function fsSetUser(data) {
  try {
    await setDoc(doc(db, 'users', USER_ID), data, { merge: true });
  } catch (e) {
    console.warn('[Firestore] SET user:', e.message);
  }
}

export async function fsCheckHealth() {
  try {
    await getDocs(query(collection(db, 'health_check'), where('userId', '==', USER_ID)));
    return true;
  } catch {
    return false;
  }
}
