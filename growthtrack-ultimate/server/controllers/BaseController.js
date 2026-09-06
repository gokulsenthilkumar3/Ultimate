import { collectionHasData, collectionPayload, collectionToClient } from '../collectionPayload.js';

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
      const items = await this.model.findMany({ where: { userId: req.user.id } });
      // Example of formatting output. Subclasses can override if needed.
      res.json(items.map(item => collectionToClient(this.name, item)));
    } catch (e) {
      this.sendError(res, e, `${this.name} list`);
    }
  }

  async create(req, res) {
    try {
      const { id, ...rawData } = req.body;
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
      const source = this.stripProtectedFields ? this.stripProtectedFields(req.body) : req.body;
      const existing = collectionHasData(this.name)
        ? await this.model.findFirst({ where: { id: req.params.id, userId: req.user.id } })
        : null;
      if (collectionHasData(this.name) && !existing) return res.status(404).json({ error: 'Record not found.' });
      const data = collectionPayload(this.name, source, existing);
      
      const item = await this.model.updateMany({
        where: { id: req.params.id, userId: req.user.id },
        data: {
          ...data,
          updatedBy: req.user.id
        }
      });
      if (!item.count) return res.status(404).json({ error: 'Record not found.' });
      if (this.auditCrud) {
        await this.auditCrud({ action: 'update', table_name: this.name, item_id: req.params.id, details: { fields: Object.keys(req.body) }, userId: req.user.id, req });
      }
      res.json({ success: true, count: item.count });
    } catch (e) {
      this.sendError(res, e, `${this.name} update`);
    }
  }

  async delete(req, res) {
    try {
      const item = await this.model.deleteMany({
        where: { id: req.params.id, userId: req.user.id }
      });
      if (!item.count) return res.status(404).json({ error: 'Record not found.' });
      if (this.auditCrud) {
        await this.auditCrud({ action: 'delete', table_name: this.name, item_id: req.params.id, details: `Deleted ${this.name} record`, userId: req.user.id, req });
      }
      res.json({ success: true, count: item.count });
    } catch (e) {
      this.sendError(res, e, `${this.name} delete`);
    }
  }

  sendError(res, error, context) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
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
