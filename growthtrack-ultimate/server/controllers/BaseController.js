import { collectionPayload, collectionToClient } from '../collectionPayload.js';
import { mutationInput, mutationCondition, nextUpdatedAt, redactedAuditFields } from '../domains/mutations.js';
import { isCompletedWorkout } from '../domains/workoutMetadata.js';

class BaseController {
  constructor(model, name, metricPayloadFn = null, stripProtectedFieldsFn = null, auditCrudFn = null) {
    this.model = model;
    this.name = name;
    this.metricPayload = metricPayloadFn;
    this.stripProtectedFields = stripProtectedFieldsFn;
    this.auditCrud = auditCrudFn;
  }

  async getAll(req, res) {
    try {
      const items = await this.model.findMany({ where: { userId: req.user.id }, ...(this.name === 'workout_sessions' ? { include: { exercises: true } } : {}) });
      // Example of formatting output. Subclasses can override if needed.
      res.json(items.map(item => collectionToClient(this.name, item)));
    } catch (e) {
      this.sendError(res, e, `${this.name} list`);
    }
  }

  async create(req, res) {
    try {
      const id = req.body?.id;
      const rawData = mutationInput(req.body);
      const source = this.stripProtectedFields ? this.stripProtectedFields(rawData) : rawData;
      const data = collectionPayload(this.name, source);
      
      const item = await this.model.create({
        data: { 
          ...data, 
          userId: req.user.id, 
          id: id == null ? undefined : String(id),
          createdBy: req.user.id,
          updatedBy: req.user.id
        }
      });
      if (this.auditCrud) {
        await this.auditCrud({ action: 'create', table_name: this.name, item_id: item.id, details: `Created ${this.name} record`, userId: req.user.id, req });
      }
      res.json(collectionToClient(this.name, item));
    } catch (e) {
      this.sendError(res, e, `${this.name} create`);
    }
  }

  async update(req, res) {
    try {
      const input = mutationInput(req.body);
      const source = this.stripProtectedFields ? this.stripProtectedFields(input) : input;
      const existing = await this.model.findFirst({ where: { id: req.params.id, userId: req.user.id }, ...(this.name === 'workout_sessions' ? { include: { exercises: true } } : {}) });
      if (!existing) return res.status(404).json({ error: 'Record not found.' });
      if (this.name === 'workout_sessions' && isCompletedWorkout(existing)) return res.status(409).json({ error: 'Completed training sessions cannot be overwritten. Delete explicitly to remove one.', code: 'WORKOUT_CONFLICT' });
      const where = mutationCondition(req, existing);
      const updatedAt = nextUpdatedAt(existing);
      const data = collectionPayload(this.name, source, existing);
      
      const item = await this.model.updateMany({
        where,
        data: {
          ...data,
          updatedBy: req.user.id,
          updatedAt,
        }
      });
      if (!item.count) return res.status(409).json({ error: 'This record has changed. Refresh before saving.', code: 'VERSION_CONFLICT' });
      if (this.auditCrud) {
        await this.auditCrud({ action: 'update', table_name: this.name, item_id: req.params.id, details: redactedAuditFields(input), userId: req.user.id, req });
      }
      res.json({ success: true, count: item.count, updatedAt });
    } catch (e) {
      this.sendError(res, e, `${this.name} update`);
    }
  }

  async delete(req, res) {
    try {
      const current = await this.model.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!current) return res.status(404).json({ error: 'Record not found.' });
      const item = await this.model.deleteMany({
        where: mutationCondition(req, current),
      });
      if (!item.count) return res.status(409).json({ error: 'This record has changed. Refresh before deleting.', code: 'VERSION_CONFLICT' });
      if (this.auditCrud) {
        await this.auditCrud({ action: 'delete', table_name: this.name, item_id: req.params.id, details: `Deleted ${this.name} record`, userId: req.user.id, req });
      }
      res.json({ success: true, count: item.count });
    } catch (e) {
      this.sendError(res, e, `${this.name} delete`);
    }
  }

  sendError(res, error, context) {
    if ([400, 409].includes(error.status)) return res.status(error.status).json({ error: error.message, code: error.code || 'INVALID_RECORD' });
    if (error.code === 'P2002') return res.status(409).json({ error: 'A record with this identifier already exists.', code: 'DUPLICATE_RECORD' });
    console.error(`[${context}]`, error);
    res.status(500).json({ error: `Internal server error during ${context}.` });
  }

  registerRoutes(router, authMiddleware) {
    router.get(`/api/${this.name}`, authMiddleware, this.getAll.bind(this));
    router.post(`/api/${this.name}`, authMiddleware, this.create.bind(this));
    router.put(`/api/${this.name}/:id`, authMiddleware, this.update.bind(this));
    router.patch(`/api/${this.name}/:id`, authMiddleware, this.update.bind(this));
    router.delete(`/api/${this.name}/:id`, authMiddleware, this.delete.bind(this));
  }
}

export default BaseController;
