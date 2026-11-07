// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createFamilyCircuitBreaker } from '../../server/domains/familyBridge.js';

describe('Family circuit breaker', () => {
  it('opens after repeated failures, allows one recovery probe and closes on success', () => {
    let time = 1000;
    const circuit = createFamilyCircuitBreaker({ now: () => time });
    for (let i = 0; i < 3; i++) { expect(circuit.acquire()).toBe(true); circuit.failure(); }
    expect(circuit.acquire()).toBe(false);
    time += 15001; expect(circuit.acquire()).toBe(true); expect(circuit.acquire()).toBe(false);
    circuit.success(); expect(circuit.acquire()).toBe(true); expect(circuit.acquire()).toBe(true);
  });
  it('reopens on a failed probe and resets failure history after a healthy response', () => {
    let time = 1;
    const circuit = createFamilyCircuitBreaker({ threshold: 1, cooldownMs: 10, now: () => time });
    circuit.failure(); time += 11; expect(circuit.acquire()).toBe(true); circuit.failure(); expect(circuit.acquire()).toBe(false);
    time += 11; expect(circuit.acquire()).toBe(true); circuit.success(); expect(circuit.acquire()).toBe(true);
  });
  it('does not count a cancelled browser request as a service failure', () => {
    const circuit = createFamilyCircuitBreaker({ threshold: 1 });
    for (let i = 0; i < 10; i++) { expect(circuit.acquire()).toBe(true); circuit.cancel(); }
    expect(circuit.acquire()).toBe(true);
  });
});
