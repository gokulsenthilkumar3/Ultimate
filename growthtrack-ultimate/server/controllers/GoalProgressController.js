import { randomUUID } from 'node:crypto';
import BaseController from './BaseController.js';
import { collectionToClient } from '../collectionPayload.js';
import { domainError, transactionWithRetry } from '../domains/errors.js';
import { mutationCondition, nextUpdatedAt } from '../domains/mutations.js';

// A progress log and the goal it advances are one operation. Replaying the
// same record id acknowledges the original log without applying it twice.
export default class GoalProgressController extends BaseController {
  constructor(prisma, auditCrud) { super(prisma.goalProgressLog, 'goal_progress_logs', null, null, auditCrud, prisma); }

  async getAll(req, res) {
    try {
      const goalId = req.query?.goalId ?? req.query?.goal_id;
      const rows = await this.model.findMany({ where: { userId: req.user.id, ...(goalId ? { goalId: String(goalId) } : {}) }, orderBy: { date: 'asc' } });
      res.json(rows);
    } catch (error) { this.sendError(res, error, 'goal progress list'); }
  }

  async create(req, res) {
    try {
      const { goalId = req.body?.goal_id, value, note = '', date, id = randomUUID() } = req.body || {};
      if (typeof goalId !== 'string' || !goalId || typeof value !== 'number' || !Number.isFinite(value) || typeof note !== 'string' || note.length > 100000 || typeof id !== 'string' || !id || id.length > 160
        || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) !== date) throw domainError(400, 'INVALID_GOAL_PROGRESS', 'Provide a goal, finite value, valid date and optional text note.');
      const result = await transactionWithRetry(this.prisma, async tx => {
        const goal = await tx.goal.findFirst({ where: { id: goalId, userId: req.user.id }, include: { subtaskRows: true } });
        if (!goal) throw domainError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
        const existing = await tx.goalProgressLog.findUnique({ where: { id } });
        if (existing) {
          if (existing.userId !== req.user.id || existing.goalId !== goalId || existing.value !== value || existing.note !== note || existing.date !== date) throw domainError(409, 'PROGRESS_ID_REUSED', 'This progress identifier was already used. Refresh before retrying.');
          return { ...existing, goal: collectionToClient('goals', goal) };
        }
        const where = mutationCondition({ ...req, params: { id: goalId } }, goal);
        const changed = await tx.goal.updateMany({ where, data: { current_value: value, ...(goal.target_value != null && value >= goal.target_value ? { status: 'completed' } : {}), updatedAt: nextUpdatedAt(goal), updatedBy: req.user.id } });
        if (!changed.count) throw domainError(409, 'VERSION_CONFLICT', 'This goal has changed. Refresh before logging progress.');
        const log = await tx.goalProgressLog.create({ data: { id, goalId, value, note, date, userId: req.user.id, createdBy: req.user.id, updatedBy: req.user.id } });
        const saved = await tx.goal.findUnique({ where: { id: goalId }, include: { subtaskRows: true } });
        return { ...log, goal: collectionToClient('goals', saved) };
      });
      if (this.auditCrud) await this.auditCrud({ action: 'create', table_name: 'goal_progress_logs', item_id: result.id, details: 'Logged goal progress', userId: req.user.id, req });
      res.json(result);
    } catch (error) {
      if (error.status === 404) return res.status(404).json({ error: error.message, code: error.code });
      this.sendError(res, error, 'goal progress create');
    }
  }
}
