import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Tabs from './Tabs';

let frames, sequence, width;
const originalScrollBy = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollBy');
const flush = () => act(() => { const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(16)); });
beforeEach(() => {
  frames = new Map(); sequence = 0; width = 900;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++sequence, callback); return sequence; });
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () { return this.classList.contains('gt-overflow-rail__items') ? 300 : 400; });
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function () { return this.classList.contains('gt-overflow-rail__items') ? width : 400; });
  Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: vi.fn(function ({ left }) { this.scrollLeft = Math.max(0, Math.min(600, this.scrollLeft + left)); this.dispatchEvent(new Event('scroll')); }) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (originalScrollBy) Object.defineProperty(HTMLElement.prototype, 'scrollBy', originalScrollBy); else Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy'); });
const show = () => render(<Tabs label="Example views" tabs={[{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }]} value="one" onChange={vi.fn()} />);

it('exposes usable scroll controls only when needed and keeps selection unchanged while browsing', () => {
  show(); flush();
  const left = screen.getByRole('button', { name: 'Scroll Example views left' });
  const right = screen.getByRole('button', { name: 'Scroll Example views right' });
  expect(left).toBeDisabled(); expect(right).toBeEnabled();
  fireEvent.click(right); flush();
  expect(HTMLElement.prototype.scrollBy).toHaveBeenCalledWith({ left: 225, behavior: 'instant' });
  expect(left).toBeEnabled(); expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true');
  const row = screen.getByRole('tablist'); row.scrollLeft = 600; fireEvent.scroll(row); flush(); expect(right).toBeDisabled();
});

it('keeps short rows free of extra buttons and removes scheduled measurements on unmount', () => {
  width = 200; const view = show(); flush();
  expect(screen.queryByRole('button', { name: /Scroll Example views/ })).toBeNull();
  fireEvent.scroll(screen.getByRole('tablist')); expect(frames.size).toBe(1);
  view.unmount(); expect(frames.size).toBe(0);
});
