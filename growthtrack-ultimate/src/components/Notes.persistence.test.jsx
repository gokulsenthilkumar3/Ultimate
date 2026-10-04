import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Notes from './Notes';

const fixture = vi.hoisted(() => ({
  state: { notes: [], addNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('../store/useStore', () => ({ default: selector => selector(fixture.state) }));
vi.mock('../hooks/useToast', () => ({ useToast: () => fixture.toast }));
vi.mock('../lib/FixedSizeList', () => ({ FixedSizeList: ({ children, itemCount, itemData }) =>
  <div>{Array.from({ length: itemCount }, (_, index) => <div key={index}>{children({ index, style: {}, data: itemData })}</div>)}</div> }));

beforeEach(() => {
  vi.clearAllMocks();
  fixture.state.notes = [
    { id: 'note-1', title: 'Workspace note', content: 'Original', tags: [], updatedAt: '2026-10-01T00:00:00.000Z' },
    { id: 'journal-1', title: 'Private journal', content: 'Secret reflection', source: 'mind-journal', tags: ['private'], updatedAt: '2026-10-01T00:00:00.000Z' },
  ];
});
afterEach(cleanup);

describe('Notes persistence feedback', () => {
  it('keeps Mind journal records out of Workspace search and tag facets', () => {
    render(<Notes />);
    expect(screen.getByRole('button', { name: 'Open note: Workspace note' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Open note: Private journal' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'private' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), { target: { value: 'Secret reflection' } });
    expect(screen.getByText('No notes match')).toBeVisible();
  });

  it('keeps edits open and reports a rejected save without claiming success', async () => {
    fixture.state.updateNote.mockRejectedValueOnce(new Error('VERSION_CONFLICT'));
    render(<Notes />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'edit', exact: true }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Unsaved change' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(fixture.toast.error).toHaveBeenCalled());
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Unsaved change');
    expect(screen.getByRole('status')).toHaveTextContent('Save failed');
    expect(fixture.toast.success).not.toHaveBeenCalled();
  });
});
