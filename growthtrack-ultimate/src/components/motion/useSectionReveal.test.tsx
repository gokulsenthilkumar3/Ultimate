import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import KineticProvider from './KineticProvider';
import useSectionReveal from './useSectionReveal';
import useStore from '../../store/useStore';
import { setKineticPreferences } from '../../hooks/useKineticPreferences';

function Region({ sections = 3 }: { sections?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useSectionReveal(ref);
  return <div ref={ref}><main>{Array.from({ length: sections }, (_, index) => <section key={index}>Section {index}</section>)}</main></div>;
}
const show = (sections?: number) => render(<KineticProvider><Region sections={sections} /></KineticProvider>);

const cancel = vi.fn();
const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel }));
const hardware = (cores: number, memory: number) => {
  Object.defineProperty(navigator, 'hardwareConcurrency', { value: cores, configurable: true });
  Object.defineProperty(navigator, 'deviceMemory', { value: memory, configurable: true });
};

beforeAll(() => { Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true, writable: true }); });
afterAll(() => { delete (Element.prototype as { animate?: unknown }).animate; });
beforeEach(() => { hardware(8, 8); setKineticPreferences({ style: 'kinetic', lite: false }); animate.mockClear(); cancel.mockClear(); });
afterEach(() => { cleanup(); useStore.setState({ reducedMotion: false }); setKineticPreferences({ style: 'kinetic', lite: false }); });

describe('section reveal', () => {
  // The hook's first-paint flag is module state: this must run first in the file.
  it('never delays the first paint of a session', () => {
    show();
    expect(animate).not.toHaveBeenCalled();
  });

  it('staggers later routes by 40ms with transform and opacity only', () => {
    show(3);
    expect(animate).toHaveBeenCalledTimes(3);
    const calls = animate.mock.calls as unknown as Array<[Array<Record<string, unknown>>, KeyframeAnimationOptions]>;
    expect(calls.map(([, options]) => options.delay)).toEqual([0, 40, 80]);
    calls.forEach(([frames, options]) => {
      expect(options.duration).toBe(320);
      frames.forEach(frame => expect(Object.keys(frame).filter(key => !['offset', 'easing'].includes(key)).sort()).toEqual(['opacity', 'transform']));
    });
  });

  it('adds a one-shot masked entry on the first section at Tier 2 only', () => {
    hardware(12, 16);
    show(2);
    const calls = animate.mock.calls as unknown as Array<[Array<Record<string, unknown>>, KeyframeAnimationOptions]>;
    expect(calls[0][0][0]).toHaveProperty('clipPath');
    expect(calls[0][1].duration).toBe(420);
    expect(calls[1][0][0]).not.toHaveProperty('clipPath');
  });

  it('is bounded to eight sections', () => {
    show(12);
    expect(animate).toHaveBeenCalledTimes(8);
  });

  it('does nothing for Lite, reduced motion or the Playful fallback', () => {
    setKineticPreferences({ style: 'kinetic', lite: true });
    show(); cleanup();
    useStore.setState({ reducedMotion: true });
    setKineticPreferences({ style: 'kinetic', lite: false });
    show(); cleanup();
    useStore.setState({ reducedMotion: false });
    setKineticPreferences({ style: 'playful', lite: false });
    show();
    expect(animate).not.toHaveBeenCalled();
  });

  it('cancels in-flight reveals when the route unmounts', () => {
    const view = show(3);
    view.unmount();
    expect(cancel).toHaveBeenCalledTimes(3);
  });
});
