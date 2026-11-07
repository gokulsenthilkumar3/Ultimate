export function createFocusTimer(minutes = 25, now = Date.now()) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) throw new Error('Choose a focus duration from 1 to 180 minutes.');
  return { durationSeconds: minutes * 60, remainingSeconds: minutes * 60, deadline: now + minutes * 60000, phase: 'running' };
}
export function focusSeconds(timer, now = Date.now()) {
  return timer?.phase === 'running' ? Math.max(0, Math.ceil((timer.deadline - now) / 1000)) : Math.max(0, timer?.remainingSeconds || 0);
}
export function pauseFocusTimer(timer, now = Date.now()) { return { ...timer, phase: 'paused', remainingSeconds: focusSeconds(timer, now), deadline: null }; }
export function resumeFocusTimer(timer, now = Date.now()) { return { ...timer, phase: 'running', deadline: now + focusSeconds(timer, now) * 1000 }; }
export function readFocusDraft(input) {
  if (!input || !['running', 'paused', 'complete'].includes(input.phase) || !Number.isFinite(input.durationSeconds) || input.durationSeconds < 60 || input.durationSeconds > 10800 || !Number.isFinite(input.remainingSeconds) || input.remainingSeconds < 0 || input.remainingSeconds > input.durationSeconds || (input.phase === 'running' && (!Number.isFinite(input.deadline) || input.deadline > Date.now() + 10800000))) return null;
  return { durationSeconds: input.durationSeconds, remainingSeconds: input.remainingSeconds, deadline: input.phase === 'running' ? input.deadline : null, phase: input.phase };
}
export function parseCompanionCommand(text) {
  const value = text.trim();
  const timer = value.match(/^\/timer\s+(\d{1,3})$/i);
  if (timer) { const minutes = Number(timer[1]); createFocusTimer(minutes, 0); return { kind: 'timer', minutes }; }
  if (/^\/(?:timer|note)\b/i.test(value) && !/^\/note\s+\S/i.test(value)) throw new Error('Use /timer 25 or /note followed by your note.');
  if (/^\/note\s+/i.test(value)) return { kind: 'note', text: value.replace(/^\/note\s+/i, '').slice(0, 10000) };
  if (/^(?:\/)?(?:memory|cpu|disk|internet|battery)\??$/i.test(value)) return { kind: 'device', topic: value.replace(/[/?]/g, '').toLowerCase() };
  if (/^(?:\/)?weather\??$/i.test(value)) return { kind: 'weather' };
  if (/^\/hide$/i.test(value)) return { kind: 'hide' };
  if (/^(hi|hello|hey)[!.]?$/i.test(value)) return { kind: 'greet' };
  throw new Error('Try /timer 25, /note your thought, memory?, weather? or /hide. Other questions belong in Agents.');
}
