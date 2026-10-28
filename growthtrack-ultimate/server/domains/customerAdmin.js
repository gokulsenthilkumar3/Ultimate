/** Authenticated readiness boundary. Product admin adapters are deliberately unconfigured. */
export function registerCustomerAdminRoutes(app, authMiddleware) {
  const products = new Set(['finsync', 'oxfin']);
  app.get('/api/admin/products/:product/customers', authMiddleware, (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!products.has(req.params.product)) return res.status(404).json({ code: 'UNKNOWN_ADMIN_PRODUCT', error: 'Product not found.' });
    return res.status(503).json({ code: 'ADMIN_ADAPTER_NOT_CONFIGURED', product: req.params.product, capabilities: { read: false, write: false }, error: 'Customer administration is not connected.' });
  });
}
