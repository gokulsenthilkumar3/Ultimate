import { describe, expect, it } from 'vitest';
import { pauseTimer, resumeTimer, timerSeconds } from './timer';
describe('timestamp-based timer recovery', () => {
  const timer = { startedAt: '2026-01-01T00:00:00Z', runningSince: 1000, accumulatedSeconds: 5 };
  it('survives background throttling and reload without interval counting', () => {
    expect(timerSeconds(timer, 61000)).toBe(65);
    expect(timerSeconds(JSON.parse(JSON.stringify(timer)), 121000)).toBe(125);
  });
  it('pauses without charging the paused interval', () => {
    const paused = pauseTimer(timer, 11000);
    expect(timerSeconds(paused, 51000)).toBe(15);
    expect(timerSeconds(resumeTimer(paused, 51000), 61000)).toBe(25);
  });
  it('does not count backwards or reset an already-running timer', () => {
    expect(timerSeconds(timer, 0)).toBe(5);
    expect(resumeTimer(timer, 500)).toBe(timer);
  });
});
