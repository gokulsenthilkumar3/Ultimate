export const WORKOUT_SOURCE = 'training-session';

export function workoutSetMetadata(exercise) {
  try {
    const value = JSON.parse(exercise.notes);
    if (value?.source !== WORKOUT_SOURCE || value?.version !== 1 || typeof value.setId !== 'string'
      || !value.set || value.set.id !== value.setId || value.set.done !== true
      || typeof value.payloadHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.payloadHash)
      || !Number.isSafeInteger(value.index) || value.index < 0) return null;
    const set = value.set;
    if (typeof set.exName !== 'string' || !set.exName.trim() || !Number.isSafeInteger(set.setNum) || set.setNum < 1
      || !Number.isSafeInteger(set.actualReps) || set.actualReps < 0
      || typeof set.actualWeight !== 'number' || !Number.isFinite(set.actualWeight) || set.actualWeight < 0) return null;
    // Never interpret legacy aggregate exercises as completed individual sets.
    if (exercise.exercise_name !== set.exName || exercise.sets !== 1
      || exercise.reps !== set.actualReps || exercise.weight_kg !== set.actualWeight) return null;
    return value;
  } catch { return null; }
}

export function workoutToClient(record) {
  const metadata = (record.exercises || []).map(workoutSetMetadata).filter(Boolean).sort((a, b) => a.index - b.index);
  return { ...record, _sets: metadata.map(value => ({ ...value.set })) };
}

export function isCompletedWorkout(record) {
  return (record.exercises || []).some(exercise => workoutSetMetadata(exercise));
}
