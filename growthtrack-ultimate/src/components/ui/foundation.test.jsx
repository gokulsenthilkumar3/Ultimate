import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchField from './SearchField';
import Pagination from './Pagination';
import DataReadiness from './DataReadiness';
import PageHeader from './PageHeader';

describe('shared UI foundation', () => {
  it('provides a labelled searchable field with result status and clear action', async () => {
    const onChange = vi.fn();
    render(<SearchField label="Search tasks" value="report" onChange={onChange} resultCount={2} />);
    expect(screen.getByRole('searchbox', { name: 'Search tasks' })).toBeVisible();
    expect(screen.getByText('2 results')).toHaveAttribute('role', 'status');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search tasks' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('announces pagination boundaries and prevents invalid navigation', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={3} pageSize={25} total={61} onPageChange={onPageChange} onPageSizeChange={vi.fn()} />);
    expect(screen.getByText('Showing 1–25 of 61')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('distinguishes insufficient data and reports sample readiness', () => {
    render(<DataReadiness state="insufficient" available={2} required={5} />);
    expect(screen.getByText('More data needed')).toBeVisible();
    expect(screen.getByText('2 of 5 required data points')).toBeVisible();
  });

  it('uses one page-level heading by default', () => {
    render(<PageHeader accent="Insights" title="Analytics" subtitle="Evidence from your data" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
  });
});
