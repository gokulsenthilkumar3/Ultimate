import React, { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import Tabs from './Tabs';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const items = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta', disabled: true }, { value: 'c', label: 'Gamma' }];
function Example() { const [value, setValue] = useState('a'); return <Tabs label="Views" tabs={items} value={value} onChange={setValue} />; }

it('moves a decorative indicator without replacing the focused tab and disposes resize observers', async () => {
  const observers = [];
  class Observer { constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); } observe() {} }
  vi.stubGlobal('ResizeObserver', Observer);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function () { return this.getAttribute('role') === 'tab' ? this.textContent.includes('Gamma') ? 180 : 120 : 500; });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(44);
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function () { return this.textContent.includes('Gamma') ? 140 : 0; });
  const view = render(<Example />);
  const gamma = screen.getByRole('tab', { name: 'Gamma' });
  expect(document.querySelector('.gt-tabs__indicator')).toHaveAttribute('aria-hidden', 'true');
  screen.getByRole('tab', { name: 'Alpha' }).focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(gamma).toHaveFocus();
  expect(gamma).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Gamma' })).toBe(gamma);
  expect(document.querySelector('.gt-tabs__indicator')).toHaveStyle({ width: '180px', transform: 'translate(140px, 0px)' });
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  view.unmount();
  expect(observers.every(observer => observer.disconnect.mock.calls.length > 0)).toBe(true);
});
