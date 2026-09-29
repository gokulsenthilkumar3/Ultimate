import { createHash, randomUUID } from 'node:crypto';
import { domainError, sendDomainError, transactionWithRetry } from './errors.js';
import { WORKOUT_SOURCE, workoutSetMetadata, workoutToClient } from './workoutMetadata.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = message => { throw domainError(400, 'INVALID_WORKOUT', message); };
const conflict = () => domainError(409, 'WORKOUT_CONFLICT', 'This session identifier has already been saved with different data. Keep the draft and review the saved session.');

function number(value, field, maximum, integer = false) {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) invalid(`${field} must be a non-negative number.`);
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0 || result > maximum || (integer && !Number.isSafeInteger(result))) invalid(`${field} is invalid.`);
  return result;
}

function text(value, field, maximum, trim = false) {
  if (typeof value !== 'string' || value.length > maximum || value.includes('\0')) invalid(`${field} is invalid.`);
  return trim ? value.trim() : value;
}

export function normalizeWorkoutCompletion(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('A completed session object is required.');
  if (typeof input.id !== 'string' || !UUID.test(input.id)) invalid('A stable session UUID is required.');
  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
    || Number.isNaN(Date.parse(`${input.date}T00:00:00Z`))
    || new Date(`${input.date}T00:00:00Z`).toISOString().slice(0, 10) !== input.date) invalid('A valid user-calendar YYYY-MM-DD date is required.');
  if (!Array.isArray(input.sets) || input.sets.length > 1000) invalid('A maximum of 1,000 sets is allowed.');
  const sets = [];
  const ids = new Set();
  for (const row of input.sets) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.done !== 'boolean') invalid('Every set requires a completed flag.');
    if (!row.done) continue;
    const id = text(row.id, 'Set identifier', 160);
    const exName = text(row.exName, 'Exercise name', 200, true);
    if (!id.trim() || !exName || ids.has(id)) invalid('Completed sets need an exercise name and unique stable identifiers.');
    ids.add(id);
    const setNum = number(row.setNum, 'Set number', 100000, true);
    if (setNum < 1) invalid('Set number must be positive.');
    sets.push({ id, exName, setNum, actualReps: number(row.actualReps, 'Actual reps', 100000, true), actualWeight: number(row.actualWeight, 'Actual weight', 1000000), done: true });
  }
  if (!sets.length) invalid('Complete at least one valid set before saving.');
  const volume = sets.reduce((sum, row) => sum + row.actualReps * row.actualWeight, 0);
  const submittedVolume = number(input.volume, 'Volume', 1e14);
  if (Math.abs(submittedVolume - volume) > Math.max(1e-8, volume * 1e-12)) invalid('Volume must match the completed actual sets.');
  return {
    id: input.id, date: input.date, notes: input.notes == null ? null : text(input.notes, 'Notes', 10000),
    duration_minutes: input.duration_minutes == null ? null : number(input.duration_minutes, 'Duration in minutes', 1000000, true),
    volume, sets,
  };
}

const fingerprint = payload => createHash('sha256').update(JSON.stringify(payload)).digest('hex');

function matchesSavedWorkout(existing, payload, hash) {
  if (existing.date !== payload.date || existing.notes !== payload.notes || existing.duration_minutes !== payload.duration_minutes || existing.volume !== payload.volume
    || existing.exercises.length !== payload.sets.length) return false;
  const metadata = existing.exercises.map(workoutSetMetadata);
  if (metadata.some(row => !row || row.payloadHash !== hash)) return false;
  metadata.sort((a, b) => a.index - b.index);
  return metadata.every((row, index) => row.index === index && JSON.stringify(row.set) === JSON.stringify(payload.sets[index]));
}

export function createWorkoutHandlers({ prisma, auditCrud, uuid = randomUUID }) {
  return {
    async complete(req, res) {
      try {
        const payload = normalizeWorkoutCompletion(req.body);
        const hash = fingerprint(payload);
        const result = await transactionWithRetry(prisma, async tx => {
          // IDs are global primary keys. Never acknowledge another owner's row.
          const existing = await tx.workoutSession.findUnique({ where: { id: payload.id }, include: { exercises: true } });
          if (existing) {
            if (existing.userId !== req.user.id || !matchesSavedWorkout(existing, payload, hash)) throw conflict();
            return { session: existing, replayed: true };
          }
          const { sets, ...session } = payload;
          await tx.workoutSession.create({ data: { ...session, userId: req.user.id, createdBy: req.user.id, updatedBy: req.user.id } });
          for (const [index, set] of sets.entries()) {
            await tx.workoutExercise.create({ data: {
              id: uuid(), sessionId: payload.id, exercise_name: set.exName, sets: 1, reps: set.actualReps, weight_kg: set.actualWeight,
              notes: JSON.stringify({ version: 1, source: WORKOUT_SOURCE, setId: set.id, index, set, payloadHash: hash }),
              createdBy: req.user.id, updatedBy: req.user.id,
            } });
          }
          return { session: await tx.workoutSession.findUnique({ where: { id: payload.id }, include: { exercises: true } }), replayed: false };
        });
        if (!result.replayed && auditCrud) {
          // A post-commit audit failure must not turn a saved session into an
          // ambiguous failure that invites a duplicate or a changed retry.
          await auditCrud({ action: 'create', table_name: 'workout_sessions', item_id: payload.id, details: `Completed workout; sets: ${payload.sets.length}`, userId: req.user.id, req }).catch(() => {});
        }
        res.setHeader('Cache-Control', 'private, no-store');
        return res.json({ ...workoutToClient(result.session), success: true, replayed: result.replayed });
      } catch (error) { return sendDomainError(res, error); }
    },
  };
}

export function registerWorkoutRoutes(app, authMiddleware, dependencies) {
  const handlers = createWorkoutHandlers(dependencies);
  app.post('/api/workout_sessions/complete', authMiddleware, handlers.complete);
  return handlers;
}
