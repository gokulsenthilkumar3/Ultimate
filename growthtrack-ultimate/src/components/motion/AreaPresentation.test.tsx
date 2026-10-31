import { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { KineticContext } from './KineticContext';
import { MotionBudget } from './motionBudget';
import HubPresentation from '../../domains/hub/HubPresentation';
import LifePresentation from '../../domains/life/LifePresentation';
import ModulePresentation from './ModulePresentation';
import PageHeader from '../ui/PageHeader';

const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
const tracks: { target: Element; frames: Keyframe[]; cancel: ReturnType<typeof vi.fn> }[] = [];
let budget: MotionBudget, frames: Map<number, FrameRequestCallback>, nextFrame: number;
const flush = () => { const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(16)); };
beforeEach(() => {
  budget = new MotionBudget(12); frames = new Map(); nextFrame = 0; tracks.length = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ x: 10, y: 20, top: 20, left: 10, right: 310, bottom: 100, width: 300, height: 80, toJSON: () => ({}) });
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: function(this: Element, frames: Keyframe[]) {
    const cancel = vi.fn(); tracks.push({ target: this, frames, cancel }); return { cancel, finished: new Promise(() => {}) };
  } });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate); else Reflect.deleteProperty(Element.prototype, 'animate');
});

it.each(['hub', 'life', 'finance', 'wellness', 'workspace'] as const)('%s decorates real content after lazy arrival and pauses without replacing the working form', async area => {
  const Presentation = area === 'hub' ? HubPresentation : area === 'life' ? LifePresentation : ({ children, ...props }: { children: React.ReactNode; page: string; view: string }) => <ModulePresentation area={area} {...props}>{children}</ModulePresentation>;
  const page = area === 'hub' ? 'profile' : 'entertainment';
  const cardClass = area === 'hub' ? 'app-hub-card' : area === 'life' ? 'media-card' : 'glass-card';
  const content = <><PageHeader title="Real owner page" /><section className={cardClass}><label>Working draft<input defaultValue="Keep this record" /></label></section></>;
  const show = (canAnimate: boolean, ready: boolean, view = 'one', tier: 0 | 2 = 2) => <StrictMode><KineticContext.Provider value={{ enabled: true, canAnimate, tier, budget }}><Presentation page={page} view={view}>{ready ? content : <p role="status">Loading</p>}</Presentation></KineticContext.Provider></StrictMode>;
  const view = render(show(true, false)); act(flush); expect(tracks).toHaveLength(0);
  view.rerender(show(true, true)); await act(async () => { await Promise.resolve(); flush(); });
  expect(document.querySelector('.workspace-art')).toHaveAttribute('aria-hidden', 'true');
  expect(tracks.some(track => track.target.matches('.' + cardClass))).toBe(true);
  expect(tracks.some(track => track.target.matches('h1'))).toBe(false);
  const input = screen.getByRole('textbox', { name: 'Working draft' }); input.focus();
  const count = tracks.length;
  view.rerender(show(false, true)); expect(budget.active).toBe(0);
  expect(document.querySelector('[data-page-motion-owner]')).toHaveAttribute('data-area-animate', 'false');
  view.rerender(show(true, true, 'two', 0)); act(flush); expect(tracks).toHaveLength(count);
  view.rerender(show(true, true, 'two')); act(flush);
  expect(screen.getByRole('textbox', { name: 'Working draft' })).toBe(input); expect(input).toHaveFocus(); expect(input).toHaveValue('Keep this record');
  view.unmount(); expect(budget.active).toBe(0); expect(frames.size).toBe(0);
});

it('settles an area immediately behind a dialog and resumes with static existing content', () => {
  const dialog = document.createElement('div'); document.body.append(dialog);
  const show = (activeDialog: HTMLElement | null) => <KineticContext.Provider value={{ enabled: true, canAnimate: true, tier: 2, budget, activeDialog }}><LifePresentation page="life"><article data-area-motion="postcard">Saved title</article></LifePresentation></KineticContext.Provider>;
  const view = render(show(null)); act(flush); expect(tracks).toHaveLength(1);
  view.rerender(show(dialog)); expect(budget.active).toBe(0); expect(tracks[0].cancel).toHaveBeenCalled();
  view.rerender(show(null)); act(flush); expect(tracks).toHaveLength(1);
  dialog.remove();
});
