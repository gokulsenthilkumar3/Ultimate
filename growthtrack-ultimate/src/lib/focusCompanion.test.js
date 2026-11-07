import { describe, expect, it } from 'vitest';
import { createFocusTimer, focusSeconds, pauseFocusTimer, readFocusDraft, resumeFocusTimer, parseCompanionCommand } from './focusCompanion';
describe('local companion commands and focus deadlines', () => {
  it('uses wall-clock deadlines through sleep and preserves remaining time across pause', () => {
    const timer = createFocusTimer(25, 1000);
    expect(focusSeconds(timer, 61000)).toBe(1440);
    const paused = pauseFocusTimer(timer, 61000);
    expect(focusSeconds(paused, 999999)).toBe(1440);
    expect(focusSeconds(resumeFocusTimer(paused, 999999), 1059999)).toBe(1380);
    expect(focusSeconds(timer, 9999999)).toBe(0);
  });
  it('rejects malformed and unbounded timer recovery records', () => {
    expect(readFocusDraft({ phase: 'running', deadline: Infinity, durationSeconds: 60, remainingSeconds: 60 })).toBeNull();
    expect(readFocusDraft({ phase: 'paused', durationSeconds: 50000, remainingSeconds: 60 })).toBeNull();
    expect(readFocusDraft(createFocusTimer(1))).toMatchObject({ phase: 'running', durationSeconds: 60 });
  });
  it('allows only explicit local commands and never interprets text as shell or AI instructions', () => {
    expect(parseCompanionCommand('/timer 25')).toEqual({ kind: 'timer', minutes: 25 });
    expect(parseCompanionCommand('/note remember milk')).toEqual({ kind: 'note', text: 'remember milk' });
    expect(parseCompanionCommand('memory?')).toEqual({ kind: 'device', topic: 'memory' });
    expect(parseCompanionCommand('weather?')).toEqual({ kind: 'weather' });
    for (const invalid of ['/timer 0', '/timer 999', '/timer 25; shutdown', 'delete everything', '/exec code']) expect(() => parseCompanionCommand(invalid)).toThrow();
  });
});
