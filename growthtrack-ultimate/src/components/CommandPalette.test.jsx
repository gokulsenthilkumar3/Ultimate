import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CommandPalette from './CommandPalette';
import useStore from '../store/useStore';
import * as quickCapture from '../lib/quickCapture';

vi.mock('../hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

beforeEach(() => useStore.getState().resetSessionData());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function openPalette() {
  render(<><button>Outside trigger</button><CommandPalette /><button>Outside after</button></>);
  screen.getByRole('button', { name: 'Outside trigger' }).focus();
  act(() => window.dispatchEvent(new Event('open-command-palette')));
  return screen.getByRole('combobox');
}

it('keeps Tab in the palette and restores the trigger on Escape', async () => {
  const input = openPalette();
  expect(input).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Close search' })).toHaveFocus();
  await userEvent.tab();
  expect(input).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Close search' })).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Outside trigger' })).toHaveFocus();
});

it('does not execute quick capture while confirming IME text', () => {
  const input = openPalette();
  fireEvent.change(input, { target: { value: 'todo renew passport' } });
  expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Add task');
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(input).toHaveValue('todo renew passport');
  expect(input).toHaveAttribute('aria-busy', 'false');
});

it('announces empty results and keeps active-descendant valid after records disappear', () => {
  useStore.setState({ notes: [
    { id: 'a', title: 'zxqvn first' }, { id: 'b', title: 'zxqvn second' },
  ] });
  const input = openPalette();
  fireEvent.change(input, { target: { value: 'zxqvn' } });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { selected: true })).toHaveTextContent('zxqvn second');
  act(() => useStore.setState({ notes: [{ id: 'a', title: 'zxqvn first' }] }));
  expect(document.getElementById(input.getAttribute('aria-activedescendant'))).toHaveTextContent('zxqvn first');
  expect(screen.getByRole('status')).toHaveTextContent('1 result');
  act(() => useStore.setState({ notes: [] }));
  expect(input).not.toHaveAttribute('aria-activedescendant');
  expect(screen.getByRole('status')).toHaveTextContent('No results');
});

it('defers search work while closed and uses fresh records when reopened', () => {
  const parse = vi.spyOn(quickCapture, 'parseQuickCapture');
  render(<CommandPalette />);
  act(() => useStore.setState({ notes: [{ id: 'a', title: 'zxqvn updated' }] }));
  expect(parse).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new Event('open-command-palette')));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zxqvn' } });
  expect(screen.getByRole('option')).toHaveTextContent('zxqvn updated');
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
  parse.mockClear();
  act(() => useStore.setState({ notes: [{ id: 'a', title: 'zxqvn latest' }] }));
  expect(parse).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new Event('open-command-palette')));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zxqvn' } });
  expect(screen.getByRole('option')).toHaveTextContent('zxqvn latest');
});
