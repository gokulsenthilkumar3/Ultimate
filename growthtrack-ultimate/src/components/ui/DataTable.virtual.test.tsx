import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import DataTable from './DataTable';
const rows = Array.from({ length: 1000 }, (_, id) => ({ id: String(id), name: `Record ${id}` }));
const keyOf = (row: typeof rows[number]) => row.id;
const columns = [{ id: 'name', header: 'Name', accessor: row => row.name, render: row => <input aria-label={`Edit ${row.name}`} defaultValue={row.name} /> }];
afterEach(cleanup);
it('bounds large tables and preserves the focused row while scrolling beyond it', async () => {
  render(<DataTable caption="Test records" rows={rows} columns={columns} rowKey={keyOf} />);
  expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '1001');
  expect(document.querySelectorAll('tr[data-virtual-key]').length).toBeLessThan(30);
  const field = screen.getByRole('textbox', { name: 'Edit Record 0' });
  field.focus(); fireEvent.change(field, { target: { value: 'Unfinished row edit' } });
  const region = screen.getByRole('region', { name: 'Test records' });
  Object.defineProperty(region, 'scrollTop', { configurable: true, value: 10000, writable: true });
  fireEvent.scroll(region);
  await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Edit Record 180' })).toBeInTheDocument());
  expect(screen.getByRole('textbox', { name: 'Edit Record 0' })).toBe(field);
  expect(field).toHaveValue('Unfinished row edit'); expect(field).toHaveFocus();
  expect(document.querySelectorAll('tr[data-virtual-key]').length).toBeLessThan(30);
});
it('attaches the virtual window after loading changes to ready', async () => {
  const view = render(<DataTable caption="Loading records" state="loading" rows={rows} columns={columns} rowKey={keyOf} />);
  view.rerender(<DataTable caption="Loading records" state="ready" rows={rows} columns={columns} rowKey={keyOf} />);
  const region = screen.getByRole('region', { name: 'Loading records' });
  Object.defineProperty(region, 'scrollTop', { configurable: true, value: 5600, writable: true }); fireEvent.scroll(region);
  await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Edit Record 100' })).toBeInTheDocument());
  expect(document.querySelectorAll('tr[data-virtual-key]').length).toBeLessThan(30);
});
