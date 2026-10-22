declare module 'firebase/firestore' {
  export type Unsubscribe = () => void;
  export const doc: any;
  export const getDoc: any;
  export const setDoc: any;
  export const updateDoc: any;
  export const deleteDoc: any;
  export const collection: any;
  export const getDocs: any;
  export const addDoc: any;
  export const onSnapshot: any;
  export const serverTimestamp: any;
  export const query: any;
  export const orderBy: any;
  export const getFirestore: any;
}

declare module 'firebase/analytics' {
  export const getAnalytics: any;
  export const isSupported: () => Promise<boolean>;
}
