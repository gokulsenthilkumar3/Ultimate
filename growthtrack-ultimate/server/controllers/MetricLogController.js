import BaseController from './BaseController.js';
import { mutationInput, mutationCondition, nextUpdatedAt, redactedAuditFields } from '../domains/mutations.js';
import { METRIC_INCLUDE, metricPayload, metricToClient } from '../domains/metricPayload.js';

class MetricLogController extends BaseController {
  constructor(model, name, metricPayloadFn = null, stripProtectedFieldsFn = null, auditCrudFn = null, metricToClientFn = null, parseStoredJsonFn = null) {
    super(model, name, metricPayloadFn || metricPayload, stripProtectedFieldsFn, auditCrudFn);
    this.metricToClient = metricToClientFn || metricToClient;
    this.parseStoredJson = parseStoredJsonFn;
  }

  async getAll(req, res) {
    try {
      const items = await this.model.findMany({ where: { userId: req.user.id }, include: METRIC_INCLUDE });
      res.json(items.map(this.metricToClient));
    } catch (e) {
      this.sendError(res, e, `${this.name} list`);
    }
  }

  async create(req, res) {
    try {
      const id = req.body?.id;
      const rawData = mutationInput(req.body);
      let data = this.metricPayload(rawData);
      
      const item = await this.model.create({
        data: { 
          ...data, 
          userId: req.user.id, 
          id: id || undefined,
          createdBy: req.user.id,
          updatedBy: req.user.id
        },
        include: METRIC_INCLUDE,
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
      const current = await this.model.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: METRIC_INCLUDE });
      if (!current) return res.status(404).json({ error: 'Record not found.' });
      
      const input = mutationInput(req.body);
      const where = mutationCondition(req, current);
      const updatedAt = nextUpdatedAt(current);
      const data = this.metricPayload(input, current);
      // An extended unique filter checks the version and owner, while Prisma's
      // nested write updates child measurements atomically with their log.
      await this.model.update({
        where,
        data: {
          ...data,
          updatedBy: req.user.id,
          updatedAt,
        }
      });
      if (this.auditCrud) {
        await this.auditCrud({ action: 'update', table_name: this.name, item_id: req.params.id, details: redactedAuditFields(input), userId: req.user.id, req });
      }
      res.json({ success: true, count: 1, updatedAt });
    } catch (e) {
      if (e.code === 'P2025') return res.status(409).json({ error: 'This record has changed. Refresh before saving.', code: 'VERSION_CONFLICT' });
      this.sendError(res, e, `${this.name} update`);
    }
  }
}

export default MetricLogController;
