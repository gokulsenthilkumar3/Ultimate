// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { registerCustomerAdminRoutes } from '../../server/domains/customerAdmin';
describe('customer-admin readiness route', () => {
  it('requires the existing authentication middleware and never returns sample records', () => {
    const app = { get: vi.fn() }, authenticate = vi.fn();
    registerCustomerAdminRoutes(app, authenticate);
    const [path, auth, handler] = app.get.mock.calls[0];
    expect(path).toBe('/api/admin/products/:product/customers'); expect(auth).toBe(authenticate);
    const response = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    handler({ params: { product: 'finsync' } }, response);
    expect(response.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ADMIN_ADAPTER_NOT_CONFIGURED', product: 'finsync', capabilities: { read: false, write: false } }));
    expect(response.json.mock.calls[0][0].rows).toBeUndefined();
  });
  it('rejects products outside the allowlist', () => {
    const app = { get: vi.fn() }; registerCustomerAdminRoutes(app, () => {});
    const response = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    app.get.mock.calls[0][2]({ params: { product: 'unknown' } }, response);
    expect(response.status).toHaveBeenCalledWith(404);
  });
});
