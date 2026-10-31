import { useRef, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KineticContext } from './KineticContext';
import { MotionBudget } from './motionBudget';
import useLandingMotion from '../../hooks/useLandingMotion';
import useViewportReveal from '../../hooks/useViewportReveal';

const gsapMock = vi.hoisted(() => {
  const sequence = { from: vi.fn(), fromTo: vi.fn() };
  const revert = vi.fn();
  return { sequence, revert, timeline: vi.fn(() => sequence), context: vi.fn((callback: () => void) => { callback(); return { revert }; }) };
});
vi.mock('gsap', () => ({ gsap: gsapMock }));

const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
const originalObserver = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver');
type Observation = { callback: IntersectionObserverCallback; targets: Set<Element>; disconnect: ReturnType<typeof vi.fn<() => void>> };
const observers: Observation[] = [];
const tracks: Array<{ target: Element; cancel: ReturnType<typeof vi.fn> }> = [];
let budget: MotionBudget;
const wrap = (children: ReactNode, canAnimate = true) => <KineticContext.Provider value={{ enabled: true, canAnimate, tier: 2, budget }}>{children}</KineticContext.Provider>;

beforeEach(() => {
  budget = new MotionBudget(12); observers.length = 0; tracks.length = 0; vi.clearAllMocks();
  class Observer {
    observation: Observation;
    constructor(callback: IntersectionObserverCallback) { this.observation = { callback, targets: new Set(), disconnect: vi.fn() }; observers.push(this.observation); }
    observe = (target: Element) => this.observation.targets.add(target);
    unobserve = (target: Element) => this.observation.targets.delete(target);
    disconnect = () => this.observation.disconnect();
  }
  vi.stubGlobal('IntersectionObserver', Observer);
  Object.defineProperty(window, 'IntersectionObserver', { configurable: true, writable: true, value: Observer });
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: function (this: Element) {
    const cancel = vi.fn(); tracks.push({ target: this, cancel }); return { cancel, finished: new Promise(() => {}) };
  } });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate);
  else Reflect.deleteProperty(Element.prototype, 'animate');
  if (originalObserver) Object.defineProperty(window, 'IntersectionObserver', originalObserver);
  else Reflect.deleteProperty(window, 'IntersectionObserver');
});
const enter = (selector: string, top = 180) => {
  const target = document.querySelector(selector)!;
  const observer = observers.find(item => item.targets.has(target))!;
  observer.callback([{ target, isIntersecting: true, boundingClientRect: { top } } as IntersectionObserverEntry], {} as IntersectionObserver);
  return observer;
};

function Hero() {
  const ref = useRef<HTMLElement>(null);
  useLandingMotion(ref);
  return <main ref={ref}><section className="playful-hero"><h1>Less noise. More you.</h1><p className="playful-hero__lead">Make space.</p><div className="character-scene--crew"><div className="character-scene__actor">Crew</div><div className="character-scene__paper">A small plan</div></div><button>Start</button></section></main>;
}
function ScrollSections() {
  const ref = useRef<HTMLElement>(null);
  useViewportReveal(ref);
  return <main ref={ref}><article className="playful-crew-card"><h2>Meet Mochi</h2></article><section className="playful-closer"><h2>Your next chapter</h2></section></main>;
}
function PersonalHero() {
  const ref = useRef<HTMLElement>(null);
  useLandingMotion(ref);
  return <main ref={ref}><section className="playful-hero"><h1>A familiar face.</h1><div className="welcome-companion__entrance"><div className="welcome-companion__actor"><span className="personal-companion">Personal companion</span></div></div></section><div className="character-scene--crew"><div className="character-scene__actor">Crew below the hero</div></div></main>;
}

describe('public choreography', () => {
  it('choreographs the headline and artwork separately, keeps the headline painted, and yields to input', async () => {
    render(wrap(<Hero />));
    await act(async () => { enter('.playful-hero'); });
    await waitFor(() => expect(gsapMock.timeline).toHaveBeenCalledTimes(1));
    const heading = screen.getByRole('heading', { level: 1 });
    const call = gsapMock.sequence.from.mock.calls.find(([target]) => target === heading);
    expect(call).toBeDefined(); expect(call![1]).not.toHaveProperty('opacity');
    expect(gsapMock.sequence.from.mock.calls.some(([target]) => target === document.querySelector('main'))).toBe(false);
    expect(gsapMock.sequence.from.mock.calls.some(([target]) => target instanceof NodeList && target[0] === document.querySelector('.character-scene__actor'))).toBe(true);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Start' }));
    expect(gsapMock.revert).toHaveBeenCalled(); expect(budget.active).toBe(0);
    expect(heading).toBeVisible(); expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  });

  it('keeps public content usable with motion paused and disposes its observers', async () => {
    const view = render(wrap(<Hero />, false));
    await act(async () => { enter('.playful-hero'); });
    expect(gsapMock.timeline).not.toHaveBeenCalled(); expect(tracks).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
    view.unmount();
    expect(observers.every(observer => observer.disconnect.mock.calls.length > 0)).toBe(true);
    expect(budget.active).toBe(0);
  });

  it('animates the personal stage entrance without taking over its pose or the lower crew', async () => {
    render(wrap(<PersonalHero />));
    await act(async () => { enter('.playful-hero'); });
    await waitFor(() => expect(gsapMock.timeline).toHaveBeenCalledTimes(1));
    const stage = document.querySelector('.welcome-companion__entrance');
    expect(gsapMock.sequence.from.mock.calls.some(([target]) => target === stage)).toBe(true);
    expect(gsapMock.sequence.from.mock.calls.some(([target]) => target === document.querySelector('.welcome-companion__actor'))).toBe(false);
    expect(gsapMock.sequence.from.mock.calls.some(([target]) => target instanceof NodeList && target[0] === document.querySelector('.character-scene__actor'))).toBe(false);
  });

  it('reveals a scrolled section once, with no hidden resting state, and cancels when feedback needs the budget', () => {
    const page = <ScrollSections />;
    const view = render(wrap(page));
    const card = document.querySelector<HTMLElement>('.playful-crew-card')!;
    expect(card.style.opacity).toBe(''); expect(card.style.transform).toBe(''); expect(tracks).toHaveLength(0);
    act(() => { enter('.playful-crew-card'); });
    expect(tracks).toHaveLength(1); expect(tracks[0].target).toBe(card);
    act(() => budget.request('urgent-feedback', 12, 99));
    expect(tracks[0].cancel).toHaveBeenCalled();
    act(() => budget.release('urgent-feedback'));
    view.rerender(wrap(page, false)); view.rerender(wrap(page));
    act(() => { enter('.playful-crew-card'); });
    expect(tracks).toHaveLength(1);
    act(() => { enter('.playful-closer', -40); });
    expect(tracks).toHaveLength(1); expect(budget.active).toBe(0);
    view.unmount(); expect(budget.active).toBe(0);
  });
});
