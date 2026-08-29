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
      res.json(items);
    } catch (e) {
      this.sendError(res, e, `${this.name} list`);
    }
  }

  async create(req, res) {
    try {
      const { id, ...rawData } = req.body;
      let data = this.stripProtectedFields ? this.stripProtectedFields(rawData) : rawData;
      
      // Clean up relations or arrays that might be in the payload
      Object.keys(data).forEach(k => {
        if (typeof data[k] === 'object' && data[k] !== null) {
          data[k] = JSON.stringify(data[k]);
        }
      });
      
      const item = await this.model.create({
        data: { 
          ...data, 
          userId: req.user.id, 
          id: id || undefined,
          createdBy: req.user.id,
          updatedBy: req.user.id
        }
      });
      if (this.auditCrud) {
        await this.auditCrud({ action: 'create', table_name: this.name, item_id: item.id, details: `Created ${this.name} record`, userId: req.user.id, req });
      }
      res.json(item);
    } catch (e) {
      this.sendError(res, e, `${this.name} create`);
    }
  }

  async update(req, res) {
    try {
      let data = this.stripProtectedFields ? this.stripProtectedFields(req.body) : req.body;
      Object.keys(data).forEach(k => {
        if (typeof data[k] === 'object' && data[k] !== null) {
          data[k] = JSON.stringify(data[k]);
        }
      });
      
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
