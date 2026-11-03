import { useLayoutEffect, useRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import useVirtualTableRows from './useVirtualTableRows';

type Row = { id: string };
const rows: Row[] = Array.from({ length: 1000 }, (_, index) => ({ id: String(index) }));
const keyOf = (row: Row) => row.id;
let frames: Map<number, FrameRequestCallback>, frameId: number;
const flushFrame = () => act(() => {
  const queued = [...frames.values()];
  frames.clear();
  queued.forEach(callback => callback(16));
});

function TableWindow({ records = rows, onCommit = () => {} }: { records?: Row[]; onCommit?: () => void }) {
  const scroll = useRef<HTMLDivElement>(null);
  const virtual = useVirtualTableRows(records, keyOf, scroll);
  useLayoutEffect(onCommit);
  return <div ref={scroll} role="region" aria-label="Records" tabIndex={0}>
    <table><tbody>{virtual.segments.map(segment => segment.kind === 'spacer'
      ? <tr key={segment.key} aria-hidden="true"><td style={{ height: segment.height }} /></tr>
      : <tr key={segment.key} data-virtual-key={segment.key}><td><input aria-label={`Edit ${segment.key}`} defaultValue={segment.key} /></td></tr>)}</tbody></table>
  </div>;
}

beforeEach(() => {
  frames = new Map(); frameId = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('ignores repeated observations of the same viewport but responds to actual scrolling', () => {
  const onCommit = vi.fn();
  render(<TableWindow onCommit={onCommit} />);
  const region = screen.getByRole('region', { name: 'Records' });
  const initialCommits = onCommit.mock.calls.length;
  fireEvent.scroll(region); flushFrame();
  fireEvent.scroll(region); flushFrame();
  expect(onCommit).toHaveBeenCalledTimes(initialCommits);

  region.scrollTop = 5600;
  fireEvent.scroll(region); flushFrame();
  expect(screen.getByRole('textbox', { name: 'Edit 100' })).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Edit 0' })).not.toBeInTheDocument();
  expect(document.querySelectorAll('tr[data-virtual-key]').length).toBeLessThan(30);
  const scrolledCommits = onCommit.mock.calls.length;
  fireEvent.scroll(region); flushFrame();
  fireEvent.scroll(region); flushFrame();
  expect(onCommit).toHaveBeenCalledTimes(scrolledCommits);
});

it('keeps the edited row pinned through reordering, then releases it when focus leaves', () => {
  const view = render(<TableWindow />);
  const field = screen.getByRole('textbox', { name: 'Edit 0' });
  act(() => field.focus()); flushFrame();
  fireEvent.change(field, { target: { value: 'Unfinished edit' } });
  const region = screen.getByRole('region', { name: 'Records' });
  region.scrollTop = 5600;
  fireEvent.scroll(region); flushFrame();
  view.rerender(<TableWindow records={[...rows.slice(1), rows[0]]} />);
  expect(screen.getByRole('textbox', { name: 'Edit 0' })).toBe(field);
  expect(field).toHaveValue('Unfinished edit');
  expect(field).toHaveFocus();
  expect(document.querySelectorAll('tr[data-virtual-key]').length).toBeLessThan(30);

  act(() => region.focus()); flushFrame();
  expect(screen.queryByRole('textbox', { name: 'Edit 0' })).not.toBeInTheDocument();
  expect(region).toHaveFocus();
});
