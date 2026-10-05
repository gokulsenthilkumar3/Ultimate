import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotesView from './Notes';

const fixture = vi.hoisted(() => ({
  state: { user: { id: 'owner' }, notes: [], addNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  files: { read: vi.fn(), download: vi.fn() },
  drafts: { list: vi.fn(), save: vi.fn(), remove: vi.fn() },
}));
vi.mock('../store/useStore', () => ({ default: selector => selector(fixture.state) }));
vi.mock('../hooks/useToast', () => ({ useToast: () => fixture.toast }));
const files = { read: fixture.files.read, download: fixture.files.download };
function Notes(props) { return <NotesView {...props} fileTransfer={files} draftStore={fixture.drafts} />; }

beforeEach(() => {
  vi.clearAllMocks();
  fixture.state.addNote.mockReset().mockImplementation(note => Promise.resolve(note));
  fixture.state.updateNote.mockReset().mockResolvedValue({ success: true });
  fixture.state.deleteNote.mockReset().mockResolvedValue({ success: true });
  fixture.files.read.mockReset().mockResolvedValue({ title: 'Imported note', content: 'Imported body' });
  fixture.drafts.list.mockReset().mockResolvedValue({ drafts: [], unreadable: 0 });
  fixture.drafts.save.mockReset().mockResolvedValue(undefined);
  fixture.drafts.remove.mockReset().mockResolvedValue(undefined);
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

  it('preserves a draft when reopening the selected note and when another note cannot be opened after a failed save', async () => {
    fixture.state.notes.push({ id: 'note-2', title: 'Second note', content: 'Second body', tags: [] });
    fixture.state.updateNote.mockRejectedValue(new Error('VERSION_CONFLICT'));
    render(<Notes view="editor" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Keep this draft');
    fireEvent.click(screen.getByRole('button', { name: 'Edit Second note' }));
    await waitFor(() => expect(fixture.toast.error).toHaveBeenCalled());
    expect(screen.getByRole('textbox', { name: 'Note title' })).toHaveValue('Workspace note');
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Keep this draft');
    expect(screen.getByRole('status')).toHaveTextContent('Save failed');
  });

  it('does not create a new note when the current draft cannot be saved', async () => {
    fixture.state.updateNote.mockRejectedValue(new Error('offline'));
    render(<Notes view="editor" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Unsent text' } });
    fireEvent.click(screen.getByRole('button', { name: 'New', exact: true }));
    await waitFor(() => expect(fixture.toast.error).toHaveBeenCalled());
    expect(fixture.state.addNote).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Unsent text');
  });

  it('filters the pinned view without including private journal records', () => {
    fixture.state.notes.push({ id: 'pinned-1', title: 'Priority', content: '', tags: [], pinned: true });
    fixture.state.notes[1].pinned = true;
    render(<Notes view="pinned" />);
    expect(screen.getByRole('button', { name: 'Open note: Priority' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Open note: Workspace note' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open note: Private journal' })).toBeNull();
  });

  it('previews an import before writing and opens the acknowledged new note', async () => {
    render(<Notes />);
    const file = new File(['# Imported note\n\nImported body'], 'import.md', { type: 'text/markdown' });
    fireEvent.change(screen.getByLabelText('Choose Markdown file'), { target: { files: [file] } });
    expect(await screen.findByRole('dialog', { name: 'Preview Markdown import' })).toBeVisible();
    expect(fixture.state.addNote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Create new note' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fixture.state.addNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'Imported note', content: 'Imported body', tags: [] }));
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Imported body');
  });

  it('keeps the import preview after a rejected create and can export unsaved editor text', async () => {
    fixture.state.addNote.mockRejectedValue(new Error('offline'));
    render(<Notes view="editor" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Recoverable export' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export Markdown' }));
    expect(fixture.files.download).toHaveBeenCalledWith(expect.objectContaining({ title: 'Workspace note', content: 'Recoverable export' }));
    fireEvent.change(screen.getByLabelText('Choose Markdown file'), { target: { files: [new File(['body'], 'import.md')] } });
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Create new note' }));
    await waitFor(() => expect(fixture.state.addNote).toHaveBeenCalled());
    await waitFor(() => expect(fixture.toast.error).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('recovers an encrypted draft for review without autosubmitting and saves against its original version', async () => {
    const baseUpdatedAt = '2026-10-01T00:00:00.000Z';
    fixture.drafts.list.mockResolvedValue({ unreadable: 0, drafts: [{ updatedAt: baseUpdatedAt,
      data: { noteId: 'note-1', title: 'Workspace note', content: 'Recovered text', tags: [], color: '#6366f1', baseUpdatedAt } }] });
    render(<Notes />);
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft: Workspace note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open recovered editor' }));
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Recovered text');
    expect(screen.getByRole('button', { name: 'Save a separate copy' })).toBeEnabled();
    await new Promise(resolve => setTimeout(resolve, 1300));
    expect(fixture.state.updateNote).not.toHaveBeenCalled();
    expect(fixture.drafts.save).toHaveBeenCalledWith('owner', expect.objectContaining({ content: 'Recovered text', baseUpdatedAt }));
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    await waitFor(() => expect(fixture.state.updateNote).toHaveBeenCalledWith('note-1', expect.objectContaining({ content: 'Recovered text' }), { expectedUpdatedAt: baseUpdatedAt }));
    await waitFor(() => expect(fixture.drafts.remove).toHaveBeenCalledWith('owner', 'note-1'));
  });

  it('preserves both versions by offering a recovered copy when the server changed', async () => {
    fixture.drafts.list.mockResolvedValue({ unreadable: 0, drafts: [{ updatedAt: '2026-10-01T00:00:00.000Z',
      data: { noteId: 'note-1', title: 'Workspace note', content: 'Older unsent edit', tags: [], color: '#6366f1', baseUpdatedAt: '2026-09-30T00:00:00.000Z' } }] });
    render(<Notes />);
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft: Workspace note' }));
    expect(screen.getByRole('button', { name: 'Open recovered editor' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save recovered copy' }));
    await waitFor(() => expect(fixture.state.addNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'Workspace note (recovered)', content: 'Older unsent edit' })));
    expect(fixture.state.updateNote).not.toHaveBeenCalled();
    expect(fixture.state.notes[0].content).toBe('Original');
  });
});
