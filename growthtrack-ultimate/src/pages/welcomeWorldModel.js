export const WORLD_STOPS = Object.freeze([
  { id: 'work', title: 'Focus Studio', area: 'Work', number: '01', x: -3.6, z: -2.1, color: '#e8b960', feature: 'tasks', action: 'Find your next task', copy: 'Give your ideas a place to land. Plan one clear next step, then make it happen.' },
  { id: 'wellbeing', title: 'Quiet Garden', area: 'Wellbeing', number: '02', x: 3.6, z: -2.1, color: '#8bc9a8', feature: 'habits', action: 'Build a small habit', copy: 'A little care goes a long way. Make room for routines, rest and the things that restore you.' },
  { id: 'life', title: 'Life Observatory', area: 'Life', number: '03', x: 0, z: 4.1, color: '#df987f', feature: 'entertainment', action: 'Make room for life', copy: 'Keep the things you love close. Collect favourites and leave a little room for discovery.' },
]);
export const DRIVE_KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift']);
export const createRover = () => ({ x: 0, z: .3, vx: 0, vz: 0, heading: Math.PI, distance: 0 });
export const createWorldController = () => ({ keys: new Set(), target: null, reset: 0, angle: .42, zoom: 1, dusk: false, pulse: 0, follow: true });
export const stopTarget = stop => ({ x: stop.x * .73, z: stop.z * .73 });

/** Bounded kinematic motion. No heavyweight physics engine or per-frame React updates. */
export function stepRover(previous, input, elapsed) {
  const dt = Math.max(0, Math.min(.06, Number.isFinite(elapsed) ? elapsed : 0));
  const keys = input.keys || new Set();
  const horizontal = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
  const vertical = Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w'));
  const angle = input.angle || 0;
  let dx = horizontal * Math.cos(angle) + vertical * Math.sin(angle);
  let dz = -horizontal * Math.sin(angle) + vertical * Math.cos(angle);
  const manual = horizontal !== 0 || vertical !== 0;
  if (!manual && input.target) { dx = input.target.x - previous.x; dz = input.target.z - previous.z; }
  const distance = Math.hypot(dx, dz), arrived = Boolean(input.target && !manual && distance < .09);
  const speed = manual ? (keys.has('shift') ? 3.5 : 2.35) : Math.min(2.35, distance * 3.5);
  if (distance > .001 && !arrived) { dx = dx / distance * speed; dz = dz / distance * speed; } else { dx = 0; dz = 0; }
  const next = { ...previous }; const count = Math.max(1, Math.ceil(dt / (1 / 60))), step = dt / count;
  for (let index = 0; index < count; index++) {
    const ease = 1 - Math.exp(-9 * step);
    next.vx += (dx - next.vx) * ease; next.vz += (dz - next.vz) * ease;
    const x = next.x, z = next.z; next.x += next.vx * step; next.z += next.vz * step;
    const radius = Math.hypot(next.x, next.z);
    if (radius > 5) { next.x *= 5 / radius; next.z *= 5 / radius; next.vx *= .3; next.vz *= .3; }
    for (const stop of WORLD_STOPS) {
      const ox = next.x - stop.x, oz = next.z - stop.z, length = Math.hypot(ox, oz);
      if (length < .85) { next.x = stop.x + (length ? ox / length : 1) * .85; next.z = stop.z + (length ? oz / length : 0) * .85; }
    }
    next.distance += Math.hypot(next.x - x, next.z - z);
  }
  if (Math.hypot(next.vx, next.vz) > .035) next.heading = Math.atan2(next.vx, next.vz);
  const nearby = WORLD_STOPS.find(stop => Math.hypot(next.x - stop.x, next.z - stop.z) < 1.5)?.id || null;
  return { ...next, nearby, arrived, manual };
}
