import { describe, expect, it, vi } from 'vitest';
import { createAuthProvider, DisabledClerkProvider, LocalAuthProvider } from './authProviders';

describe('authentication providers', () => {
  it('uses local authentication by default', () => {
    expect(createAuthProvider()).toBeInstanceOf(LocalAuthProvider);
  });

  it('normalizes email and returns an internal session contract', async () => {
    const client = vi.fn().mockResolvedValue({ user: { id: 'u1' }, expiresAt: 'tomorrow', csrfToken: 'token' });
    const result = await new LocalAuthProvider(client).signIn({ email: ' OWNER@EXAMPLE.COM ', password: 'secret' });
    expect(client).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ body: JSON.stringify({ email: 'owner@example.com', password: 'secret' }) }));
    expect(result).toEqual({ user: { id: 'u1' }, session: { expiresAt: 'tomorrow' } });
  });

  it('rejects incomplete credentials before sending a request', async () => {
    const client = vi.fn();
    await expect(new LocalAuthProvider(client).signIn({ email: '', password: '' })).rejects.toThrow('Email and password are required');
    expect(client).not.toHaveBeenCalled();
  });

  it('forwards an authenticator code without storing it in the session contract', async () => {
    const client = vi.fn().mockResolvedValue({ user: { id: 'u1' }, csrfToken: 'csrf', expiresAt: 'tomorrow' });
    const result = await new LocalAuthProvider(client).signIn({ email: 'owner@example.test', password: 'fictional-password', otp: '123456' });
    expect(JSON.parse(client.mock.calls[0][1].body).otp).toBe('123456');
    expect(result).toEqual({ user: { id: 'u1' }, session: { expiresAt: 'tomorrow' } });
  });

  it('keeps Clerk explicitly disabled until configured and installed', async () => {
    const provider = createAuthProvider({ type: 'clerk' });
    expect(provider).toBeInstanceOf(DisabledClerkProvider);
    await expect(provider.signIn()).rejects.toThrow('not configured');
    expect(() => createAuthProvider({ type: 'clerk', enabled: true })).toThrow('not installed');
  });

  it('propagates an unacknowledged logout instead of reporting success', async () => {
    const client = vi.fn().mockRejectedValue(new Error('Server unavailable'));
    await expect(new LocalAuthProvider(client).signOut()).rejects.toThrow('Server unavailable');
  });
});
