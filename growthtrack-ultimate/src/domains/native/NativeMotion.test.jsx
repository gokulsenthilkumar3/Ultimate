import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Card, ModuleFrame } from './ModuleUI';

const { motion, animate, revert } = vi.hoisted(() => ({ motion: { canAnimate: true }, animate: vi.fn(), revert: vi.fn() }));
vi.mock('../../hooks/usePlayfulMotion', () => ({ default: () => motion }));
vi.mock('../../components/motion/CharacterScene', () => ({ default: () => <span aria-hidden="true" />, MotionToggle: () => <button>Pause motion</button> }));
vi.mock('gsap', () => ({ default: { fromTo: animate, context(callback) { const dispose = callback(); return { add: action => action(), revert: () => { dispose?.(); revert(); } }; } } }));
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
beforeEach(() => { animate.mockImplementation(() => ({ cancel: revert })); Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); motion.canAnimate = true; if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate); else delete Element.prototype.animate; });
const frame = count => <ModuleFrame domain="family" title="Family Connect" subtitle="Test" kind="snip" view="tree" tabs={[{ value: 'tree', label: 'Tree' }]} onViewChange={() => {}}>{Array.from({ length: count }, (_, id) => <Card title={`Story ${id}`} key={id}><button>Read story {id}</button></Card>)}</ModuleFrame>;

describe('bounded native motion', () => {
  it('animates the owning frame once while late-loading records stay immediately usable', async () => {
    const view = render(frame(0));
    view.rerender(frame(5));
    await waitFor(() => expect(animate).toHaveBeenCalledTimes(1));
    view.rerender(frame(50));
    await waitFor(() => expect(animate).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Read story 49' })).toBeVisible();
    expect(animate.mock.calls[0][0].every(frame => Object.keys(frame).every(key => ['opacity', 'transform'].includes(key)))).toBe(true);
  });
  it('leaves controls visible and stops observers/tweens when motion is disabled', async () => {
    const view = render(frame(2));
    motion.canAnimate = false;
    await act(async () => view.rerender(frame(2)));
    expect(revert).toHaveBeenCalled();
    expect(view.container.querySelector('[data-motion]')).toHaveAttribute('data-motion', 'false');
    expect(screen.getByRole('button', { name: 'Read story 1' })).toBeVisible();
  });
});
