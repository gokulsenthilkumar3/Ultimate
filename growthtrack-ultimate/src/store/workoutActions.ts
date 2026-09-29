import { apiSync } from './useStore';
import { captureSession, createWriteQueue, requireRecord } from './persistence';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const localDate = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

export function createWorkoutCompletion(set: any, get: any) {
  const queue = createWriteQueue();
  const legacyIds = new WeakMap<object, string>();
  return (day: any) => {
    const current = captureSession(get);
    const owner = `${get()._sessionVersion}:${get().user?.id}`;
    return queue(`${owner}:workout-completion`, async () => {
      if (!day || typeof day !== 'object') throw new Error('A training session is required.');
      if (!current()) throw new Error('The session changed. Your training draft was not saved.');
      let id = day._sessionId ?? (UUID.test(String(day.id)) ? String(day.id) : legacyIds.get(day));
      if (!id) { id = crypto.randomUUID(); legacyIds.set(day, id); }
      if (!UUID.test(id)) throw new Error('Training requires a stable session UUID.');
      const date = day._date ?? day.date ?? localDate();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Training requires a valid session date.');
      // Legacy callers may provide explicitly checked actual sets, never merely
      // a schedule's planned reps/weight. Nothing is invented from the plan.
      const source = Array.isArray(day._sets) ? day._sets : (day.exercises ?? []).filter((row: any) => row.done === true);
      const sets = source.filter((row: any) => row.done === true).map((row: any, index: number) => {
        const reps = Number(row.actualReps), weight = Number(row.actualWeight);
        if (row.actualReps == null || row.actualReps === '' || typeof row.actualReps === 'boolean' || !Number.isSafeInteger(reps) || reps < 0 || row.actualWeight == null || row.actualWeight === '' || typeof row.actualWeight === 'boolean' || !Number.isFinite(weight) || weight < 0) throw new Error('Completed sets require valid actual reps and weight (zero is allowed).');
        const setNum = Number(row.setNum ?? index + 1), exName = String(row.exName ?? row.name ?? '').trim();
        if (!exName || !Number.isSafeInteger(setNum) || setNum < 1) throw new Error('Each completed set needs an exercise name and set number.');
        return { id: String(row.id ?? `${id}-set-${index + 1}`), exName, setNum, actualReps: reps, actualWeight: weight, done: true };
      });
      if (new Set(sets.map((row: any) => row.id)).size !== sets.length) throw new Error('Completed set identifiers must be unique.');
      const duration = day._durationMinutes ?? day.duration_minutes ?? null;
      if (duration != null && (!Number.isSafeInteger(Number(duration)) || Number(duration) < 0)) throw new Error('Session duration must be a non-negative whole number of minutes.');
      const payload = { id, date, notes: day._notes ?? day.notes ?? day.muscleGroup ?? day.day ?? '', duration_minutes: duration == null ? null : Number(duration), volume: sets.reduce((sum: number, row: any) => sum + row.actualReps * row.actualWeight, 0), sets };
      // The backend owns atomicity and idempotence. Failed/ambiguous responses
      // must reject, keeping Training's draft; never fall back to two writes.
      const saved = requireRecord(await apiSync('/workout_sessions/complete', 'POST', payload));
      if (saved.id !== id || !Array.isArray(saved._sets)) throw new Error('The server did not acknowledge the completed session and sets. Keep the draft and retry.');
      if (current()) set((state: any) => ({ workouts: { ...state.workouts, sessions: [saved, ...(state.workouts?.sessions ?? []).filter((row: any) => row.id !== id)] } }));
      return saved;
    });
  };
}
