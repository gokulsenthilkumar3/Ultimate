import { domainError, sendDomainError } from './errors.js';

export function createLocationHandlers({ prisma, auditCrud = async () => {} }) {
  const wrap = handler => async (req, res) => { try { await handler(req, res); } catch (error) { sendDomainError(res, error); } };
  return {
    list: wrap(async (req, res) => {
      res.setHeader('Cache-Control', 'private, no-store');
      res.json(await prisma.locationPoint.findMany({ where: { userId: req.user.id }, orderBy: { capturedAt: 'desc' }, take: 500 }));
    }),
    create: wrap(async (req, res) => {
      const coordinate = value => typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
      const latitude = Number(req.body?.latitude), longitude = Number(req.body?.longitude);
      if (!coordinate(req.body?.latitude) || !coordinate(req.body?.longitude) || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw domainError(400, 'INVALID_COORDINATES', 'Valid coordinates are required.');
      const capturedAt = req.body?.capturedAt ? new Date(req.body.capturedAt) : new Date();
      if (!Number.isFinite(capturedAt.getTime())) throw domainError(400, 'INVALID_CAPTURE_TIME', 'Capture time is invalid.');
      const rawAccuracy = req.body?.accuracyM;
      const accuracyM = rawAccuracy == null ? null : Number(rawAccuracy);
      if (accuracyM !== null && (!coordinate(rawAccuracy) || !Number.isFinite(accuracyM) || accuracyM < 0)) throw domainError(400, 'INVALID_ACCURACY', 'Accuracy must be a non-negative number.');
      const source = String(req.body?.source || 'browser').slice(0, 32);
      const point = await prisma.locationPoint.create({ data: { userId: req.user.id, latitude, longitude, accuracyM, source, capturedAt } });
      await auditCrud({ action: 'create', table_name: 'location_points', item_id: point.id, details: { fields: ['location'], values: 'redacted' }, userId: req.user.id, req });
      res.json(point);
    }),
    delete: wrap(async (req, res) => {
      const result = await prisma.locationPoint.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
      if (!result.count) throw domainError(404, 'LOCATION_NOT_FOUND', 'Location not found.');
      await auditCrud({ action: 'delete', table_name: 'location_points', item_id: req.params.id, details: { deleted: result.count }, userId: req.user.id, req });
      res.json({ success: true, count: result.count });
    }),
    deleteAll: wrap(async (req, res) => {
      if (req.body?.confirm !== true) throw domainError(400, 'CONFIRMATION_REQUIRED', 'Confirm location history deletion with confirm: true.');
      const result = await prisma.locationPoint.deleteMany({ where: { userId: req.user.id } });
      if (result.count) await auditCrud({ action: 'delete', table_name: 'location_points', item_id: 'history', details: { deleted: result.count }, userId: req.user.id, req });
      else req.auditWritten = true;
      res.json({ success: true, count: result.count });
    }),
  };
}

export function registerLocationRoutes(app, auth, dependencies) {
  const handlers = createLocationHandlers(dependencies);
  app.get('/api/locations', auth, handlers.list);
  app.post('/api/locations', auth, handlers.create);
  app.delete('/api/locations/:id', auth, handlers.delete);
  app.delete('/api/locations', auth, handlers.deleteAll);
  return handlers;
}
