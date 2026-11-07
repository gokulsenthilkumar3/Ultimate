import { expect, it } from 'vitest';
import { createRover, createWorldController, stepRover, stopTarget, WORLD_STOPS } from './welcomeWorldModel';

it('normalizes diagonal movement, clamps long frames and respects the island boundary', () => {
  const input = createWorldController(); input.angle = 0; input.keys.add('w');
  const straight = stepRover(createRover(), input, .06);
  input.keys.add('d'); const diagonal = stepRover(createRover(), input, .06);
  expect(Math.hypot(diagonal.vx, diagonal.vz)).toBeCloseTo(Math.hypot(straight.vx, straight.vz));
  expect(stepRover(createRover(), input, 10)).toEqual(diagonal);
  let rover = createRover(); for (let i = 0; i < 600; i++) rover = stepRover(rover, input, .06);
  expect(Math.hypot(rover.x, rover.z)).toBeLessThanOrEqual(5.001);
});
it('reaches every tour destination without entering its building collider', () => {
  for (const stop of WORLD_STOPS) {
    const input = createWorldController(); input.target = stopTarget(stop); let rover = createRover();
    for (let i = 0; i < 600 && !rover.arrived; i++) rover = stepRover(rover, input, 1 / 60);
    expect(rover.arrived).toBe(true); expect(rover.nearby).toBe(stop.id);
    expect(Math.hypot(rover.x - stop.x, rover.z - stop.z)).toBeGreaterThanOrEqual(.85);
  }
});
it('manual input overrides a destination and release brakes rather than leaving a stuck key', () => {
  const input = createWorldController(); input.target = stopTarget(WORLD_STOPS[0]); input.keys.add('d');
  let rover = stepRover(createRover(), input, .06); expect(rover.manual).toBe(true);
  input.keys.clear(); input.target = null;
  for (let i = 0; i < 100; i++) rover = stepRover(rover, input, .03);
  expect(Math.hypot(rover.vx, rover.vz)).toBeLessThan(.001);
});
