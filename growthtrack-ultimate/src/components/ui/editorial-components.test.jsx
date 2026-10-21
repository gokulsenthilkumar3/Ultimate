import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DataTable from './DataTable';
import DevGallery from './DevGallery';
import PageState from './PageState';
import SearchField from './SearchField';

afterEach(cleanup);

describe('editorial component states', () => {
  it('does not expose stale records while loading or after a failed refresh', async () => {
    const row = { id: 'a', name: 'Existing record' };
    const retry = vi.fn();
    const props = { caption: 'Records', rows: [row], rowKey: item => item.id, columns: [{ id: 'name', header: 'Name', accessor: item => item.name }] };
    const view = render(<DataTable {...props} state="loading" onRetry={retry} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();

    view.rerender(<DataTable {...props} state="error" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This view could not load');
    expect(screen.queryByRole('table')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();

    view.rerender(<DataTable {...props} />);
    expect(screen.getByRole('table', { name: 'Records' })).toHaveTextContent('Existing record');
  });

  it('keeps unavailable search controls read-only and uses matching state icons', () => {
    const view = render(<SearchField label="Search notes" value="draft" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('searchbox')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Clear search notes' })).toBeNull();
    view.rerender(<PageState state="empty" />);
    expect(screen.getByRole('status')).toHaveTextContent('Nothing here yet');
    expect(screen.getByRole('status').querySelector('.gt-page-state__icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('offers a development gallery with working tabs and a focus-managed dialog', async () => {
    render(<DevGallery />);
    expect(screen.getByRole('heading', { level: 1, name: 'Editorial components' })).toBeVisible();
    await userEvent.click(screen.getByRole('tab', { name: 'Records' }));
    expect(screen.getByRole('table', { name: 'Sample records' })).toBeVisible();
    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Example dialog' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
