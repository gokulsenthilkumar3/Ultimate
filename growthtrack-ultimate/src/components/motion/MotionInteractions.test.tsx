import { useEffect, useRef, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LazyMotion, domAnimation } from 'framer-motion';
import { KineticContext } from './KineticContext';
import { MotionBudget } from './motionBudget';
import PageTransition from './PageTransition';
import SurfaceLight from './SurfaceLight';
import Modal from '../ui/Modal';
import usePageEntrance from '../../hooks/usePageEntrance';
import { setPlayfulMotionPaused } from '../../hooks/usePlayfulMotion';
import useStore from '../../store/useStore';

const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
const originalMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
const tracks: Array<{ target: Element; frames: Keyframe[]; cancel: ReturnType<typeof vi.fn> }> = [];
let budget: MotionBudget;
const animate = vi.fn(function (this: Element, frames: Keyframe[]) {
  const cancel = vi.fn();
  tracks.push({ target: this, frames, cancel });
  return { cancel, finished: new Promise(() => {}) };
});
const context = (children: ReactNode, options: Partial<NonNullable<React.ContextType<typeof KineticContext>>> = {}) =>
  <KineticContext.Provider value={{ enabled: true, canAnimate: true, tier: 2, budget, activeDialog: null, ...options }}>{children}</KineticContext.Provider>;

beforeEach(() => {
  budget = new MotionBudget(12); tracks.length = 0; animate.mockClear();
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(query => ({ matches: query.includes('pointer: fine'), media: query, addEventListener() {}, removeEventListener() {} })) });
  useStore.setState({ reducedMotion: false }); setPlayfulMotionPaused(false);
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); setPlayfulMotionPaused(false);
  useStore.setState({ reducedMotion: false });
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate);
  else Reflect.deleteProperty(Element.prototype, 'animate');
  if (originalMedia) Object.defineProperty(window, 'matchMedia', originalMedia);
  else Reflect.deleteProperty(window, 'matchMedia');
});

describe('motion preserves working state', () => {
  it('keeps a focused draft mounted when Kinetic, Playful and reduced motion change', async () => {
    const mounts = vi.fn();
    function Draft() {
      useEffect(() => { mounts(); }, []);
      return <main><section><label>Saved note<textarea defaultValue="" /></label></section><section>Related records</section></main>;
    }
    const page = <PageTransition pageKey="notes"><Draft /></PageTransition>;
    const view = render(context(page));
    const field = screen.getByRole('textbox', { name: 'Saved note' });
    await userEvent.type(field, 'Keep my unfinished paragraph');
    view.rerender(context(page, { enabled: false }));
    view.rerender(context(page, { canAnimate: false, tier: 0 }));
    view.rerender(context(page));
    expect(screen.getByRole('textbox', { name: 'Saved note' })).toBe(field);
    expect(field).toHaveValue('Keep my unfinished paragraph'); expect(field).toHaveFocus();
    expect(mounts).toHaveBeenCalledTimes(1);
  });

  it('cancels section choreography on pause and priority pre-emption without replaying a finished route', () => {
    const sections = <main><section>Heading</section><section>Metrics</section><section>Records</section></main>;
    const page = (key: string) => <PageTransition pageKey={key}>{sections}</PageTransition>;
    // Consume the session's first-paint exemption, regardless of test ordering.
    const warmup = render(context(page('first'))); warmup.unmount(); tracks.length = 0;
    const view = render(context(page('tasks')));
    const entering = [...tracks]; expect(entering).toHaveLength(3);
    view.rerender(context(page('tasks'), { canAnimate: false }));
    entering.forEach(track => expect(track.cancel).toHaveBeenCalled());
    expect(budget.active).toBe(0);
    view.rerender(context(page('tasks')));
    expect(tracks).toHaveLength(3);
    view.rerender(context(page('goals')));
    const next = tracks.slice(3); expect(next).toHaveLength(3);
    act(() => budget.request('urgent-feedback', 12, 99));
    next.forEach(track => expect(track.cancel).toHaveBeenCalled());
    expect(budget.active).toBe(12);
    act(() => budget.release('urgent-feedback'));
    expect(budget.active).toBe(0); expect(tracks).toHaveLength(6);
  });

  it('moves only a native panel in tab order, reverses on going back, and retains form focus', async () => {
    function Panel({ view }: { view: string }) {
      const ref = useRef<HTMLDivElement>(null);
      usePageEntrance(ref, view);
      return <div ref={ref}><div role="tablist" aria-label="Example views">{['a', 'b'].map(key => <button role="tab" key={key} aria-selected={view === key}>{key}</button>)}</div><section role="tabpanel"><label>Panel draft<input defaultValue="" /></label></section></div>;
    }
    const view = render(context(<Panel view="a" />));
    expect(tracks).toHaveLength(0);
    const field = screen.getByRole('textbox', { name: 'Panel draft' });
    await userEvent.type(field, 'Keep this');
    view.rerender(context(<Panel view="b" />));
    expect(tracks[0].target).toBe(screen.getByRole('tabpanel'));
    expect(tracks[0].frames[0].transform).toBe('translateX(12px)');
    view.rerender(context(<Panel view="a" />));
    expect(tracks[0].cancel).toHaveBeenCalled();
    expect(tracks[1].frames[0].transform).toBe('translateX(-12px)');
    expect(field).toHaveValue('Keep this'); expect(field).toHaveFocus();
    act(() => setPlayfulMotionPaused(true));
    expect(tracks[1].cancel).toHaveBeenCalled(); expect(budget.active).toBe(0);
  });

  it('keeps an open dialog form mounted while its motion style changes', async () => {
    const dialog = <LazyMotion features={domAnimation}><Modal open title="Edit note" onClose={() => {}} actions={undefined} descriptionId={undefined}><label>Dialog draft<input defaultValue="" /></label></Modal></LazyMotion>;
    const view = render(context(dialog, { canAnimate: false }));
    const field = screen.getByRole('textbox', { name: 'Dialog draft' });
    await userEvent.type(field, 'Still editing');
    view.rerender(context(dialog, { enabled: false, canAnimate: false }));
    expect(screen.getByRole('textbox', { name: 'Dialog draft' })).toBe(field);
    expect(field).toHaveValue('Still editing'); expect(field).toHaveFocus();
  });
});

describe('one shared surface light', () => {
  const surfaces = <><article className="stat-card" data-testid="surface"><label>Card draft<input defaultValue="" /></label></article><button>Outside</button><SurfaceLight /></>;
  function measure() {
    const card = screen.getByTestId('surface');
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ x: 10, y: 20, left: 10, top: 20, right: 290, bottom: 200, width: 280, height: 180, toJSON: () => ({}) });
    return card;
  }
  it('lights keyboard attention without moving the card, clears on scroll, and frees its slot on unmount', () => {
    const view = render(context(surfaces));
    const card = measure();
    screen.getByRole('textbox', { name: 'Card draft' }).focus();
    const light = document.querySelector('.kinetic-surface-light');
    expect(light).toHaveAttribute('data-active', 'true');
    expect(light).toHaveStyle({ transform: 'translate3d(10px, 20px, 0)', width: '280px' });
    expect(card.style.transform).toBe(''); expect(budget.active).toBe(1);
    fireEvent.scroll(document);
    expect(light).toHaveAttribute('data-active', 'false'); expect(budget.active).toBe(0);
    screen.getByRole('button', { name: 'Outside' }).focus();
    screen.getByRole('textbox', { name: 'Card draft' }).focus();
    expect(budget.active).toBe(1);
    view.unmount(); expect(budget.active).toBe(0);
    expect(document.querySelector('.kinetic-surface-light')).toBeNull();
  });

  it('stops immediately when paused or pre-empted, and ignores touch input', () => {
    const view = render(context(surfaces));
    const card = measure();
    const touch = new Event('pointerover', { bubbles: true }); Object.assign(touch, { pointerType: 'touch', clientX: 30, clientY: 40 });
    fireEvent(card, touch);
    const light = document.querySelector('.kinetic-surface-light');
    expect(light).toHaveAttribute('data-active', 'false'); expect(budget.active).toBe(0);
    screen.getByRole('textbox', { name: 'Card draft' }).focus();
    expect(budget.active).toBe(1);
    act(() => budget.setLimit(0));
    expect(light).toHaveAttribute('data-active', 'false');
    act(() => budget.setLimit(12));
    screen.getByRole('button', { name: 'Outside' }).focus();
    screen.getByRole('textbox', { name: 'Card draft' }).focus();
    view.rerender(context(surfaces, { canAnimate: false }));
    expect(light).toHaveAttribute('data-active', 'false'); expect(budget.active).toBe(0);
  });

  it('skips Lite and reduced motion and refuses to light a card behind a dialog', () => {
    const view = render(context(surfaces, { tier: 0 })); measure();
    const field = screen.getByRole('textbox', { name: 'Card draft' });
    field.focus(); expect(budget.active).toBe(0);
    const overlay = document.createElement('div'); document.body.append(overlay);
    view.rerender(context(surfaces, { activeDialog: overlay }));
    screen.getByRole('button', { name: 'Outside' }).focus(); field.focus();
    expect(budget.active).toBe(0);
    overlay.remove();
  });

  it('clips the portal to the card scroll container', () => {
    // jsdom reports visible axes for the overflow shorthand, so declare the measured scroll axes explicitly.
    render(context(<div data-testid="scroll" style={{ overflowX: 'auto', overflowY: 'auto' }}>{surfaces}</div>));
    measure();
    const scroll = screen.getByTestId('scroll');
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 100, left: 0, top: 100, right: 500, bottom: 500, width: 500, height: 400, toJSON: () => ({}) });
    screen.getByRole('textbox', { name: 'Card draft' }).focus();
    const light = document.querySelector<HTMLElement>('.kinetic-surface-light')!;
    expect(light).toHaveAttribute('data-active', 'true');
    expect(light.style.clipPath).toBe('inset(80px 0px 0px 0px)');
  });
});
