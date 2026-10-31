import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { KineticContext } from '../../components/motion/KineticContext';
import { MotionBudget } from '../../components/motion/motionBudget';
import InsightsMotion from './InsightsMotion';
import { mountInsightsMotion } from './useInsightsMotion';

const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
const tracks: Array<{ target: Element; frames: Keyframe[]; cancel: ReturnType<typeof vi.fn> }> = [];
let budget: MotionBudget, root: HTMLDivElement, stops: Array<() => void>, frames: Map<number, FrameRequestCallback>, frameId: number;
const rect = (top = 20) => ({ x: 10, y: top, left: 10, top, right: 310, bottom: top + 80, width: 300, height: 80, toJSON: () => ({}) });
const flush = () => { const queued = [...frames]; frames.clear(); queued.forEach(([, callback]) => callback(16)); };
const start = () => { const stop = mountInsightsMotion(root, { budget, id: 'test', tier: 2, seen: new WeakSet() }); stops.push(stop); flush(); return stop; };
async function settle() {
  await Promise.resolve();
  flush();
  await Promise.resolve();
}
beforeEach(() => {
  budget = new MotionBudget(12); root = document.createElement('div'); document.body.append(root);
  stops = []; frames = new Map(); frameId = 0; tracks.length = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => rect());
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: function (this: Element, keyframes: Keyframe[]) {
    const cancel = vi.fn(); tracks.push({ target: this, frames: keyframes, cancel }); return { cancel, finished: new Promise(() => {}) };
  } });
});
afterEach(() => {
  cleanup(); stops.forEach(stop => stop()); root.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate); else Reflect.deleteProperty(Element.prototype, 'animate');
});

describe('Insights content choreography', () => {
  it('handles a nested lazy page arriving after a loading skeleton, and keeps headings painted', async () => {
    root.innerHTML = '<div role="status">Loading</div>'; start(); expect(tracks).toHaveLength(0);
    root.innerHTML = '<h1>Analytics</h1><section data-insight="plot">Actual chart</section>';
    await settle();
    expect(tracks).toHaveLength(1); expect(tracks[0].target).toBe(root.querySelector('section'));
    expect(root.querySelector('h1')?.style.opacity).toBe('');
    expect(root.querySelector('section')?.style.opacity).toBe('');
  });

  it('admits new query cards after earlier cards have already been encountered', async () => {
    root.innerHTML = Array.from({ length: 8 }, () => '<section data-insight="metric">Existing</section>').join(''); start();
    tracks.forEach(track => track.cancel.mockClear());
    const later = document.createElement('section'); later.dataset.insight = 'model'; later.textContent = 'Saved model'; root.append(later);
    await settle();
    expect(tracks.some(track => track.target === later)).toBe(true);
  });

  it('ignores numeric text-node interpolation instead of scanning the page every frame', async () => {
    root.innerHTML = '<section data-insight="metric"><span>1</span></section>'; start();
    root.querySelector('span')!.textContent = '12'; await Promise.resolve();
    expect(frames.size).toBe(0); expect(tracks).toHaveLength(1);
  });

  it('draws observed lines while preserving the projected line dash pattern and every plotted value', () => {
    root.innerHTML = '<section data-insight="plot"><svg><path class="recharts-line-curve" d="M0 20L100 10" /><path class="recharts-line-curve" stroke-dasharray="4 3" d="M100 10L200 0" /></svg></section>';
    const paths = [...root.querySelectorAll('path')];
    paths.forEach(path => Object.defineProperty(path, 'getTotalLength', { value: () => 200 }));
    start();
    const observed = tracks.find(track => track.target === paths[0])!, projected = tracks.find(track => track.target === paths[1])!;
    expect(observed.frames[0].strokeDashoffset).toBe(200);
    expect(projected.frames.every(frame => !('strokeDasharray' in frame))).toBe(true);
    expect(paths[1].getAttribute('stroke-dasharray')).toBe('4 3');
    expect(paths[0].getAttribute('d')).toBe('M0 20L100 10'); expect(paths[1].getAttribute('d')).toBe('M100 10L200 0');
  });

  it('reflows surviving action cards after removal without retaining a retired record', async () => {
    root.innerHTML = '<article data-insight="queue" data-insight-key="a">Acknowledged action</article><article data-insight="queue" data-insight-key="b">Still waiting</article>';
    const first = root.children[0], survivor = root.children[1];
    Object.defineProperty(first, 'getBoundingClientRect', { configurable: true, value: () => rect(20) });
    Object.defineProperty(survivor, 'getBoundingClientRect', { configurable: true, value: () => rect(first.isConnected ? 120 : 20) });
    start(); first.remove(); await settle();
    expect(root.querySelector('[data-insight-key="a"]')).toBeNull();
    expect(tracks.some(track => track.target === survivor && track.frames[0].transform === 'translateY(100px)')).toBe(true);
    expect(root.textContent).toBe('Still waiting');
  });

  it('settles immediately for export and leaves newly arrived content still until capture ends', async () => {
    root.innerHTML = '<main data-insight-still="false"><section data-insight="plot">Chart</section></main>'; start();
    root.dispatchEvent(new Event('insights:still'));
    expect(tracks[0].cancel).toHaveBeenCalled(); expect(budget.active).toBe(0);
    // Capture locks immediately, before React commits the exporting attribute.
    root.querySelector('main')!.insertAdjacentHTML('beforeend', '<section data-insight="metric">Current value</section>');
    await settle(); expect(tracks).toHaveLength(1); expect(root.textContent).toContain('Current value');
    root.querySelector('main')!.setAttribute('data-insight-still', 'true');
    root.dispatchEvent(new Event('insights:resume'));
    await settle(); expect(tracks).toHaveLength(1);
    root.querySelector('main')!.setAttribute('data-insight-still', 'false');
    await settle(); expect(tracks).toHaveLength(2);
  });

  it('yields to field focus and priority feedback, and releases every reservation on unmount', () => {
    root.innerHTML = '<section data-insight="tile"><input aria-label="Draft" value="Keep editing" /></section><section data-insight="metric">Count</section>'; const stop = start();
    const input = root.querySelector('input')!; input.focus();
    expect(tracks[0].cancel).toHaveBeenCalled(); expect(input.value).toBe('Keep editing'); expect(document.activeElement).toBe(input);
    budget.request('urgent', 12, 99);
    expect(tracks[1].cancel).toHaveBeenCalled();
    budget.release('urgent'); stop(); expect(budget.active).toBe(0);
  });

  it('skips offscreen content and bounds a large arrival to eight visible targets', () => {
    root.innerHTML = Array.from({ length: 30 }, () => '<section data-insight="metric">Count</section>').join('');
    Object.defineProperty(root.children[0], 'getBoundingClientRect', { configurable: true, value: () => rect(-100) }); start();
    expect(tracks).toHaveLength(8); expect(tracks.some(track => track.target === root.children[0])).toBe(false);
    expect(budget.active).toBeLessThanOrEqual(12);
  });

  it('cancels on pause and Lite without replacing a focused form or replaying existing content', () => {
    const content = <section data-insight="tile"><label>Working draft<input defaultValue="Keep this" /></label></section>;
    const page = (canAnimate: boolean, tier: 0 | 2 = 2) => <KineticContext.Provider value={{ enabled: true, canAnimate, tier, budget }}><InsightsMotion page="dashboards">{content}</InsightsMotion></KineticContext.Provider>;
    const view = render(page(true)); act(flush); const before = tracks.length;
    const field = screen.getByRole('textbox', { name: 'Working draft' }); field.focus();
    view.rerender(page(false)); expect(budget.active).toBe(0);
    view.rerender(page(true, 0)); view.rerender(page(true));
    act(flush);
    expect(screen.getByRole('textbox', { name: 'Working draft' })).toBe(field); expect(field).toHaveFocus(); expect(field).toHaveValue('Keep this');
    expect(tracks).toHaveLength(before);
  });

  it('runs the surviving StrictMode entrance instead of consuming it during the development rehearsal', () => {
    render(<StrictMode><KineticContext.Provider value={{ enabled: true, canAnimate: true, tier: 2, budget }}><InsightsMotion page="overview"><section data-insight="focus">Actual content</section></InsightsMotion></KineticContext.Provider></StrictMode>);
    expect(tracks).toHaveLength(0);
    act(flush);
    expect(tracks).toHaveLength(1); expect(budget.active).toBe(1);
    cleanup(); expect(tracks[0].cancel).toHaveBeenCalled(); expect(budget.active).toBe(0);
  });
});
