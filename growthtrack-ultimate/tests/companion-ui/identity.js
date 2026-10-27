// This module is aliased only by the localhost fixture server, never by a product build.
export const fixtureUser = { uid: 'isolated-companion-owner', id: 'isolated-companion-owner', displayName: 'Alex Fixture', name: 'Alex Fixture', email: 'alex@example.test', emailVerified: true };
const activeUser = location.pathname.startsWith('/dashboard') || location.pathname === '/onboarding' ? fixtureUser : null;
export const auth = { get app() { return app; }, currentUser: activeUser, onAuthStateChanged: callback => { queueMicrotask(() => callback(activeUser)); return () => {}; }, signOut: async () => {} };
export const db = {};
export const app = { options: { apiKey: 'isolated-key' } };
const session = { data: { user: fixtureUser, expires: '2099-01-01T00:00:00Z' }, status: 'authenticated', update: async () => {} };
export const useSession = () => session;
export const signOut = async () => {};
export const signIn = async () => ({ error: 'Isolated UI fixture: real sign-in is verified separately.', ok: false });
export const SessionProvider = ({ children }) => children;
export const onAuthStateChanged = (_, callback) => auth.onAuthStateChanged(callback);
export const updateProfile = async () => {};
export const signInWithEmailAndPassword = async () => { throw new Error('Isolated UI fixture: real sign-in is verified separately.'); };
export const createUserWithEmailAndPassword = signInWithEmailAndPassword;
export const sendPasswordResetEmail = signInWithEmailAndPassword;
export const sendEmailVerification = async () => {};
export class GoogleAuthProvider {}
export class OAuthProvider { addScope() {} }
export class GithubAuthProvider {}
export const getAdditionalUserInfo = () => null;
export const updatePassword = signInWithEmailAndPassword;
export const reauthenticateWithCredential = signInWithEmailAndPassword;
export const EmailAuthProvider = { credential: () => ({}) };
export const getAuth = () => auth;
export const signInAnonymously = signInWithEmailAndPassword;
export class PhoneAuthProvider {}
export const PhoneMultiFactorGenerator = {};
export const signInWithPopup = signInWithEmailAndPassword;
export const signInWithCustomToken = signInWithEmailAndPassword;
