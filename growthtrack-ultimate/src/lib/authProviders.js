import { apiRequest, refreshCsrfToken, setCsrfToken } from './apiClient';

export class LocalAuthProvider {
  constructor(client = apiRequest) {
    this.id = 'local';
    this.client = client;
  }

  async initialize() { return this.session(); }

  async session() {
    const data = await this.client('/api/auth/me');
    await refreshCsrfToken();
    return { user: data.user, session: { expiresAt: data.expiresAt } };
  }

  async signIn({ email, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !String(password || '')) throw new Error('Email and password are required');
    const data = await this.client('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: normalizedEmail, password }) });
    setCsrfToken(data.csrfToken);
    return { user: data.user, session: { expiresAt: data.expiresAt } };
  }

  async signOut() {
    try { await this.client('/api/auth/logout', { method: 'POST', body: '{}' }); }
    finally { setCsrfToken(null); }
  }
}

export class DisabledClerkProvider {
  constructor() { this.id = 'clerk'; }
  async initialize() { throw new Error('Clerk authentication is not configured'); }
  async session() { return null; }
  async signIn() { throw new Error('Clerk authentication is not configured'); }
  async signOut() { setCsrfToken(null); }
}

export function createAuthProvider(config = {}) {
  const type = config.type || 'local';
  if (type === 'local') return new LocalAuthProvider(config.client);
  if (type === 'clerk' && config.enabled === true) throw new Error('Clerk adapter is not installed');
  if (type === 'clerk') return new DisabledClerkProvider();
  throw new Error(`Unsupported authentication provider: ${type}`);
}
