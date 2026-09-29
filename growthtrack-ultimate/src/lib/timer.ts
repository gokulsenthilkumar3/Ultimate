export interface RecoverableTimer {
  startedAt: string | null;
  runningSince: number | null;
  accumulatedSeconds: number;
}
export function timerSeconds(timer: RecoverableTimer, now = Date.now()): number {
  const elapsed = timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince) / 1000;
  return Math.floor(Math.max(0, timer.accumulatedSeconds) + elapsed);
}
export function pauseTimer(timer: RecoverableTimer, now = Date.now()): RecoverableTimer {
  return { ...timer, accumulatedSeconds: timerSeconds(timer, now), runningSince: null };
}
export function resumeTimer(timer: RecoverableTimer, now = Date.now()): RecoverableTimer {
  return timer.runningSince !== null ? timer : { ...timer, startedAt: timer.startedAt || new Date(now).toISOString(), runningSince: now };
}
