import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mountScrollEdges } from './useScrollEdges';

let frames: Map<number, FrameRequestCallback>, frameId: number, element: HTMLDivElement, frame: HTMLDivElement, stop: () => void;
const flush = () => { const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(16)); };
beforeEach(() => {
  frames = new Map(); frameId = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  element = document.createElement('div'); frame = document.createElement('div'); frame.append(element); document.body.append(frame);
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: 300 });
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 900 });
  stop = () => {};
});
afterEach(() => { stop(); frame.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('shows only the hidden-content edges without changing the native scroll position or events', () => {
  stop = mountScrollEdges(element, frame); flush();
  expect(frame.dataset.scrollLeft).toBe('false'); expect(frame.dataset.scrollRight).toBe('true');
  element.scrollLeft = 270;
  const event = new Event('scroll', { cancelable: true }); element.dispatchEvent(event); element.dispatchEvent(new Event('scroll'));
  expect(frames.size).toBe(1); flush();
  expect(frame.dataset.scrollLeft).toBe('true'); expect(frame.dataset.scrollRight).toBe('true');
  expect(event.defaultPrevented).toBe(false); expect(element.scrollLeft).toBe(270);
  element.scrollLeft = 600; element.dispatchEvent(new Event('scroll')); flush();
  expect(frame.dataset.scrollRight).toBe('false');
});

it('maps RTL edges to the physical sides and clamps elastic overscroll', () => {
  element.style.direction = 'rtl'; stop = mountScrollEdges(element, frame); flush();
  expect(frame.dataset.scrollLeft).toBe('true'); expect(frame.dataset.scrollRight).toBe('false');
  element.scrollLeft = -650; element.dispatchEvent(new Event('scroll')); flush();
  expect(frame.dataset.scrollLeft).toBe('false'); expect(frame.dataset.scrollRight).toBe('true');
});

it('updates after arriving content or a resize and removes observers, cues and pending work on cleanup', async () => {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 300 });
  stop = mountScrollEdges(element, frame); flush(); expect(frame.dataset.scrollRight).toBe('false');
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 900 }); element.append(document.createElement('span'));
  await Promise.resolve(); flush(); expect(frame.dataset.scrollRight).toBe('true');
  element.dispatchEvent(new Event('scroll')); stop(); expect(frames.size).toBe(0);
  expect(frame.hasAttribute('data-scroll-right')).toBe(false);
  window.dispatchEvent(new Event('resize')); element.dispatchEvent(new Event('scroll')); element.append(document.createElement('span'));
  await Promise.resolve(); expect(frames.size).toBe(0);
});

it('moves a long tab row with a normal mouse wheel and lets the page scroll at the row ends', () => {
  stop = mountScrollEdges(element, frame, { wheel: true }); flush();
  const wheel = new WheelEvent('wheel', { deltaY: 120, cancelable: true }); element.dispatchEvent(wheel); flush();
  expect(wheel.defaultPrevented).toBe(true); expect(element.scrollLeft).toBe(120);
  element.scrollLeft = 600;
  const end = new WheelEvent('wheel', { deltaY: 120, cancelable: true }); element.dispatchEvent(end);
  expect(end.defaultPrevented).toBe(false); expect(element.scrollLeft).toBe(600);
  element.scrollLeft = 599;
  const roundedEnd = new WheelEvent('wheel', { deltaY: 120, cancelable: true }); element.dispatchEvent(roundedEnd);
  expect(roundedEnd.defaultPrevented).toBe(false); expect(element.scrollLeft).toBe(599);
});

it('preserves trackpad horizontal input, modifier gestures and native scrolling outside tab rails', () => {
  stop = mountScrollEdges(element, frame, { wheel: true }); flush();
  for (const values of [{ deltaX: 80, deltaY: 120 }, { deltaY: 120, ctrlKey: true }, { deltaY: 120, shiftKey: true }]) {
    const event = new WheelEvent('wheel', { ...values, cancelable: true }); element.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
  }
  expect(element.scrollLeft).toBe(0);
  stop(); stop = mountScrollEdges(element, frame); flush();
  const normal = new WheelEvent('wheel', { deltaY: 120, cancelable: true }); element.dispatchEvent(normal); expect(normal.defaultPrevented).toBe(false);
});

it('forwards a boundary wheel to a scrollable ancestor and releases it at the outer boundary', () => {
  const parent = document.createElement('div');
  parent.style.overflowY = 'auto';
  frame.replaceWith(parent); parent.append(frame);
  Object.defineProperty(parent, 'clientHeight', { configurable: true, value: 300 });
  Object.defineProperty(parent, 'scrollHeight', { configurable: true, value: 700 });
  stop = mountScrollEdges(element, frame, { wheel: true }); flush();
  element.scrollLeft = 600;
  const boundary = new WheelEvent('wheel', { deltaY: 120, cancelable: true });
  element.dispatchEvent(boundary);
  expect(boundary.defaultPrevented).toBe(true);
  expect(parent.scrollTop).toBe(120);
  parent.scrollTop = 400;
  const outerEnd = new WheelEvent('wheel', { deltaY: 120, cancelable: true });
  element.dispatchEvent(outerEnd);
  expect(outerEnd.defaultPrevented).toBe(false);
});

it('handles line-mode wheels in RTL and releases scrolling when the listener is removed', () => {
  element.style.direction = 'rtl'; stop = mountScrollEdges(element, frame, { wheel: true }); flush();
  const event = new WheelEvent('wheel', { deltaY: 3, deltaMode: 1, cancelable: true }); element.dispatchEvent(event); flush();
  expect(element.scrollLeft).toBe(-48); expect(event.defaultPrevented).toBe(true);
  stop(); const after = new WheelEvent('wheel', { deltaY: 120, cancelable: true }); element.dispatchEvent(after); expect(after.defaultPrevented).toBe(false);
});

it('reveals a newly selected offscreen tab without moving the document or snapping back during manual scrolling', async () => {
  element.innerHTML = '<button aria-selected="true">First</button><button aria-selected="false">Last</button>';
  const first = element.children[0], last = element.children[1];
  const rect = (left: number, right: number) => ({ left, right, x: left, y: 0, top: 0, bottom: 44, width: right - left, height: 44, toJSON: () => ({}) });
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect(0, 300));
  vi.spyOn(first, 'getBoundingClientRect').mockImplementation(() => rect(10 - element.scrollLeft, 80 - element.scrollLeft));
  vi.spyOn(last, 'getBoundingClientRect').mockImplementation(() => rect(760 - element.scrollLeft, 850 - element.scrollLeft));
  stop = mountScrollEdges(element, frame, { revealSelection: true }); flush(); expect(element.scrollLeft).toBe(0);
  first.setAttribute('aria-selected', 'false'); last.setAttribute('aria-selected', 'true'); await Promise.resolve(); flush();
  expect(element.scrollLeft).toBe(558);
  element.scrollLeft = 100; element.dispatchEvent(new Event('scroll')); flush(); expect(element.scrollLeft).toBe(100);
});

it('updates controls when an ancestor changes direction without resizing the row', async () => {
  const changed = vi.fn(); frame.setAttribute('dir', 'ltr');
  vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ direction: frame.getAttribute('dir') } as CSSStyleDeclaration));
  stop = mountScrollEdges(element, frame, { onChange: changed }); flush();
  expect(changed.mock.lastCall?.[0].rtl).toBe(false);
  frame.setAttribute('dir', 'rtl'); await Promise.resolve(); flush();
  expect(changed.mock.lastCall?.[0]).toMatchObject({ rtl: true, left: true, right: false });
  stop(); changed.mockClear(); frame.setAttribute('dir', 'ltr'); await Promise.resolve(); flush();
  expect(changed).not.toHaveBeenCalled();
});
