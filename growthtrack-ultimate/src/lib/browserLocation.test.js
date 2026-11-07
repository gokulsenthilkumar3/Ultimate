import { describe, expect, it, vi } from 'vitest';
import { requestBrowserLocation, locationErrorMessage } from './browserLocation';

const point = { coords: { latitude: 0, longitude: 0, accuracy: 50 }, timestamp: 123 };
const browser = getCurrentPosition => ({ isSecureContext: true, navigator: { geolocation: { getCurrentPosition } } });
describe('explicit device location recovery', () => {
  it('accepts valid zero coordinates and first tries a bounded coarse fix', async () => {
    const get = vi.fn(success => success(point));
    await expect(requestBrowserLocation({ browser: browser(get) })).resolves.toBe(point);
    expect(get.mock.calls[0][2]).toEqual({ enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 });
  });
  it('retries acquisition failure once with a fresh accurate fix instead of treating timeout as denial', async () => {
    const get = vi.fn().mockImplementationOnce((_success, fail) => fail({ code: 3 })).mockImplementationOnce(success => success(point));
    await expect(requestBrowserLocation({ browser: browser(get) })).resolves.toBe(point);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][2]).toEqual({ enableHighAccuracy: true, maximumAge: 0, timeout: 18000 });
  });
  it('does not retry a permission denial or replace it with third-party IP tracking', async () => {
    const get = vi.fn((_success, fail) => fail({ code: 1 }));
    await expect(requestBrowserLocation({ browser: browser(get) })).rejects.toMatchObject({ code: 1 });
    expect(get).toHaveBeenCalledTimes(1);
    expect(locationErrorMessage({ code: 1 })).toContain('browser permissions');
  });
  it('explains insecure contexts and policy blocks before opening a prompt', async () => {
    const get = vi.fn(); const context = browser(get);
    await expect(requestBrowserLocation({ browser: { ...context, isSecureContext: false } })).rejects.toMatchObject({ code: 'INSECURE_CONTEXT' });
    await expect(requestBrowserLocation({ browser: { ...context, document: { permissionsPolicy: { allowsFeature: () => false } } } })).rejects.toMatchObject({ code: 'POLICY_BLOCKED' });
    expect(get).not.toHaveBeenCalled();
  });
  it('cancels navigation-bound requests and ignores late callbacks', async () => {
    const controller = new AbortController(); let receive;
    const pending = requestBrowserLocation({ signal: controller.signal, browser: browser(success => { receive = success; }) });
    controller.abort(); receive(point);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
