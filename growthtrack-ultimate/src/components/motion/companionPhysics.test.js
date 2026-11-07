import { expect, it } from 'vitest';
import { stepPendulum, ROPE_STYLES } from './companionPhysics';
it.each(Object.keys(ROPE_STYLES))('%s rope settles instead of requesting frames forever', key => {
  let state = { angle: .8, velocity: 1 };
  for (let frame = 0; frame < 1800 && !state.sleeping; frame++) state = stepPendulum(state, 1 / 60, ROPE_STYLES[key]);
  expect(state).toEqual({ angle: 0, velocity: 0, sleeping: true });
});
it('bounds catch-up work after suspension and recovers invalid state without NaNs', () => {
  expect(stepPendulum({ angle: 1, velocity: 3 }, 3600)).toEqual(stepPendulum({ angle: 1, velocity: 3 }, .05));
  expect(stepPendulum({ angle: NaN, velocity: Infinity }, NaN)).toEqual({ angle: 0, velocity: 0, sleeping: true });
});
