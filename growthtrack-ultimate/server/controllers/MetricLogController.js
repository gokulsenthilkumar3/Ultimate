import BaseController from './BaseController.js';

class MetricLogController extends BaseController {
  constructor(model, name, metricPayloadFn = null, stripProtectedFieldsFn = null, auditCrudFn = null, metricToClientFn = null, parseStoredJsonFn = null) {
    super(model, name, metricPayloadFn, stripProtectedFieldsFn, auditCrudFn);
    this.metricToClient = metricToClientFn;
    this.parseStoredJson = parseStoredJsonFn;
  }

  async getAll(req, res) {
    try {
      const items = await this.model.findMany({ where: { userId: req.user.id } });
      res.json(items.map(this.metricToClient));
    } catch (e) {
      this.sendError(res, e, `${this.name} list`);
    }
  }

  async create(req, res) {
    try {
      const { id, ...rawData } = req.body;
      let data = this.metricPayload(rawData);
      
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
      res.json(this.metricToClient(item));
    } catch (e) {
      this.sendError(res, e, `${this.name} create`);
    }
  }

  async update(req, res) {
    try {
      const current = await this.model.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!current) return res.status(404).json({ error: 'Record not found.' });
      
      let data = this.metricPayload({ ...this.parseStoredJson(current?.data, {}), ...req.body });
      
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
}

export default MetricLogController;
