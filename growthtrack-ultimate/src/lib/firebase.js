import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const USER_ID = 'default_user';

// ── CRUD helpers ──────────────────────────────────────────────────────────────

export async function fsGetCollection(col) {
  try {
    const q = query(collection(db, col), where('userId', '==', USER_ID));
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
