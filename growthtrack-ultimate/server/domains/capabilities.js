import { sendDomainError } from './errors.js';

const CONNECTIONS = ['apple_health', 'google_fit', 'fitbit', 'garmin', 'bank', 'google_drive', 'onedrive', 'dropbox'];

export function createCapabilitiesHandler({ prisma, version, checkoutAvailable }) {
  return async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { subscriptionTier: true } });
      if (!user) return res.status(404).json({ code: 'USER_NOT_FOUND', error: 'Account not found.' });
      res.setHeader('Cache-Control', 'private, no-store');
      res.json({
        version,
        billing: { checkoutAvailable: Boolean(checkoutAvailable()), tier: user.subscriptionTier || null },
        connections: CONNECTIONS.map(provider => ({ provider, status: 'setup-required',
          reason: provider === 'apple_health' ? 'A verified native health connection is required.'
            : provider === 'bank' ? 'A bank connection is not configured. CSV import is available.'
              : 'This provider connection has not been implemented.' })),
      });
    } catch (error) { sendDomainError(res, error); }
  };
}
