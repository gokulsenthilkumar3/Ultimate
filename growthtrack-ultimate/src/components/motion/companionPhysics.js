/** Original bounded pendulum solver: no physics engine or background polling. */
export const ROPE_STYLES = Object.freeze({
  linen: { label: 'Linen', damping: 1.6, gravity: 14, dash: '' },
  chain: { label: 'Chain', damping: 1.1, gravity: 18, dash: '3 4' },
  spring: { label: 'Spring', damping: 2.2, gravity: 10, dash: '1 3' },
  vine: { label: 'Vine', damping: 1.8, gravity: 12, dash: '8 3 2 3' },
  ribbon: { label: 'Ribbon', damping: 2.8, gravity: 16, dash: '' },
});
export function stepPendulum(state, deltaSeconds, style = ROPE_STYLES.linen) {
  let angle = Number.isFinite(state.angle) ? Math.max(-1.25, Math.min(1.25, state.angle)) : 0;
  let velocity = Number.isFinite(state.velocity) ? Math.max(-6, Math.min(6, state.velocity)) : 0;
  const elapsed = Math.max(0, Math.min(.05, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
  const count = Math.max(1, Math.ceil(elapsed * 120)), dt = elapsed / count;
  for (let index = 0; index < count; index++) {
    velocity += (-style.gravity * Math.sin(angle) - style.damping * velocity) * dt;
    angle += velocity * dt;
  }
  const sleeping = Math.abs(angle) < .003 && Math.abs(velocity) < .015;
  return sleeping ? { angle: 0, velocity: 0, sleeping: true } : { angle, velocity, sleeping: false };
}
