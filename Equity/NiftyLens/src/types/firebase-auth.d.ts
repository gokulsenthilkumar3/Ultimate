declare module 'firebase/auth' {
  export type User = { uid: string; email: string | null; displayName: string | null };
  export type Auth = { currentUser: User | null };
  export function onAuthStateChanged(auth: Auth, callback: (user: User | null) => void): () => void;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<unknown>;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<unknown>;
  export function signOut(auth: Auth): Promise<void>;
  export function sendPasswordResetEmail(auth: Auth, email: string): Promise<void>;
  export class GoogleAuthProvider {}
  export function signInWithPopup(auth: Auth, provider: GoogleAuthProvider): Promise<unknown>;
  export function getAuth(app: unknown): Auth;
}
