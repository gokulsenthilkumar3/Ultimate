import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  fixture.state.user = { id: 'owner' };
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
  it('bounds a large library while searching all notes and retaining the open editor across pages', async () => {
    fixture.state.notes = Array.from({ length: 51 }, (_, index) => ({ id: `library-${index}`, title: `Library note ${index}`, content: `Body ${index}`, tags: [], updatedAt: '2026-10-01T00:00:00.000Z' }));
    fixture.state.notes.push({ id: 'private', title: 'Private journal', content: 'Secret', source: 'mind-journal', tags: [] });
    render(<Notes />);
    expect(screen.getByRole('list', { name: 'Workspace notes' }).children).toHaveLength(25);
    expect(screen.queryByRole('button', { name: 'Open note: Private journal' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next notes page' }));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Library note 25' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Unsaved text survives paging' } });
    fireEvent.click(screen.getByRole('button', { name: 'Previous notes page' }));
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Unsaved text survives paging');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), { target: { value: 'Library note 50' } });
    expect(screen.getByRole('list', { name: 'Workspace notes' }).children).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Open note: Library note 50' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Notes pages' })).not.toBeInTheDocument();
    expect(fixture.state.updateNote.mock.calls.every(([id, payload]) => id === 'library-25' && payload.content === 'Unsaved text survives paging')).toBe(true);
  }, 15_000);

  it('clamps library paging when records are removed', async () => {
    fixture.state.notes = Array.from({ length: 26 }, (_, index) => ({ id: `library-${index}`, title: `Library note ${index}`, content: 'Body', tags: [] }));
    const view = render(<Notes />);
    fireEvent.click(screen.getByRole('button', { name: 'Next notes page' }));
    expect(screen.getByRole('list', { name: 'Workspace notes' }).children).toHaveLength(1);
    fixture.state.notes = fixture.state.notes.slice(0, 1);
    view.rerender(<Notes />);
    expect(screen.getByRole('button', { name: 'Open note: Library note 0' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Notes pages' })).not.toBeInTheDocument();
    await waitFor(() => expect(fixture.drafts.list).toHaveBeenCalled());
  });

  it('duplicates through the selected record port and retries an ambiguous write with exactly the same ID and content', async () => {
    const add = vi.fn().mockRejectedValueOnce(new Error('Lost response')).mockImplementation(async note => {
      const saved = { ...note, revision: 1 }; fixture.state.notes.push(saved); return saved;
    });
    render(<Notes records={{ add }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate note' }));
    await screen.findByRole('button', { name: 'Retry duplicate' });
    const first = add.mock.calls[0][0];
    expect(first).toMatchObject({ title: 'Workspace note (copy)', content: 'Original', pinned: false, starred: false });
    expect(first.id).not.toBe('note-1');
    fireEvent.click(screen.getByRole('button', { name: 'Retry duplicate' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Note content' }).value).toBe('Original'));
    expect(add.mock.calls[1][0]).toEqual(first);
    expect(fixture.state.addNote).not.toHaveBeenCalled();
    expect(fixture.state.notes[0]).toMatchObject({ id: 'note-1', content: 'Original' });
    expect(fixture.toast.success).toHaveBeenCalledWith('Note duplicated.');
  });

  it('keeps an unsaved source open and does not create a copy if saving it fails', async () => {
    fixture.state.updateNote.mockRejectedValue(new Error('Offline'));
    render(<Notes view="editor" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate note' }));
    await screen.findByText(/Save failed/);
    expect(fixture.state.addNote).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Note content' }).value).toBe('Keep this draft');
  });

  it('does not let a delayed copy acknowledgement replace a newer draft', async () => {
    let acknowledge;
    fixture.state.addNote.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
    render(<Notes view="editor" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate note' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Newer draft' } });
    await act(async () => acknowledge(fixture.state.addNote.mock.calls[0][0]));
    expect(screen.getByRole('textbox', { name: 'Note content' }).value).toBe('Newer draft');
  });

  it('ignores a copy acknowledgement after the account changes', async () => {
    let acknowledge;
    fixture.state.addNote.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
    const { rerender } = render(<Notes />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate note' }));
    fixture.state.user = { id: 'other-owner' }; fixture.state.notes = [];
    rerender(<Notes />);
    await act(async () => acknowledge(fixture.state.addNote.mock.calls[0][0]));
    expect(fixture.toast.success).not.toHaveBeenCalledWith('Note duplicated.');
    expect(screen.queryByRole('textbox', { name: 'Note content' })).toBeNull();
  });

  it('preserves a different unsaved editor when retrying an earlier copy', async () => {
    fixture.state.notes.push({ id: 'note-2', title: 'Second', content: 'Second original', tags: [] });
    fixture.state.addNote.mockRejectedValue(new Error('Lost response'));
    fixture.state.updateNote.mockRejectedValue(new Error('Offline'));
    render(<Notes view="editor" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate note' }));
    await screen.findByRole('button', { name: 'Retry duplicate' });
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Second' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Second unfinished draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Retry duplicate' }));
    await screen.findByText(/Save failed/);
    expect(fixture.state.addNote).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Note content' }).value).toBe('Second unfinished draft');
    expect(screen.getByRole('button', { name: 'Retry duplicate' })).toBeTruthy();
  });

  it('does not resubmit text already acknowledged by the pending autosave', async () => {
    let acknowledge;
    fixture.state.notes[0].revision = 1;
    fixture.state.updateNote.mockReturnValue(new Promise(resolve => { acknowledge = resolve; }));
    render(<Notes view="editor" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'One edit' } });
    await waitFor(() => expect(fixture.state.updateNote).toHaveBeenCalledTimes(1), { timeout: 2500 });
    await act(async () => { acknowledge({ id: 'note-1', revision: 2, updatedAt: '2026-10-06T00:00:00.000Z' }); });
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    await screen.findByRole('button', { name: 'Edit', exact: true });
    expect(fixture.state.updateNote).toHaveBeenCalledTimes(1);
  });

  it('follows stable links after a rename and shows owned backlinks', async () => {
    fixture.state.notes[0].content = '# Overview\n\n[[note-2|Original name]]';
    fixture.state.notes.push({ id: 'note-2', title: 'Renamed target', content: 'Target body', tags: [] });
    render(<Notes />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    expect(screen.getByRole('navigation', { name: 'Note outline' })).toHaveTextContent('Overview');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Original name', exact: true })); });
    expect(screen.getByRole('navigation', { name: 'Note backlinks' })).toHaveTextContent('Workspace note');
    expect(screen.getAllByText('Target body').at(-1)).toBeVisible();
    fireEvent.click(screen.getByRole('navigation', { name: 'Note backlinks' }).querySelector('button'));
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeVisible();
  });

  it('requires a choice for ambiguous titles and retries linked creation with the same ID', async () => {
    fixture.state.notes[0].content = '[[Duplicate]] [[Missing]]';
    fixture.state.notes.push({ id: 'a', title: 'Duplicate', content: 'A body', tags: [] }, { id: 'b', title: 'Duplicate', content: 'B body', tags: [] });
    fixture.state.addNote.mockRejectedValueOnce(new Error('Response lost')).mockImplementation(note => Promise.resolve(note));
    render(<Notes />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Duplicate', exact: true })); });
    expect(screen.getByRole('dialog', { name: 'Resolve note link' })).toHaveTextContent('Choose the intended note.');
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Missing', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Create linked note' }));
    await waitFor(() => expect(fixture.toast.error).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Create linked note' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fixture.state.addNote.mock.calls[0][0].id).toBe(fixture.state.addNote.mock.calls[1][0].id);
  });

  it('keeps an imported record ID after an ambiguous create failure', async () => {
    fixture.state.addNote.mockRejectedValueOnce(new Error('Response lost')).mockImplementation(note => Promise.resolve(note));
    const { container } = render(<Notes />);
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['# Retry'], 'retry.md')] } });
    await screen.findByRole('dialog', { name: 'Preview Markdown import' });
    fireEvent.click(screen.getByRole('button', { name: 'Create new note' }));
    await waitFor(() => expect(fixture.toast.error).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Create new note' }));
    await waitFor(() => expect(fixture.state.addNote).toHaveBeenCalledTimes(2));
    expect(fixture.state.addNote.mock.calls[0][0].id).toBe(fixture.state.addNote.mock.calls[1][0].id);
  });

  it('shows revision evidence and restores through the versioned port', async () => {
    const records = { add: fixture.state.addNote, update: fixture.state.updateNote, remove: fixture.state.deleteNote,
      revisions: vi.fn().mockResolvedValue({ items: [{ revision: 1, title: 'Earlier', content: 'Before', createdAt: '2026-10-01T00:00:00.000Z' }], nextCursor: null }),
      restore: vi.fn().mockResolvedValue({ id: 'note-1', title: 'Earlier', content: 'Before', tags: [], revision: 3 }) };
    render(<Notes records={records} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Workspace note' }));
    fireEvent.click(screen.getByRole('button', { name: 'History', exact: true }));
    await screen.findByRole('button', { name: 'Restore revision 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Restore revision 1' }));
    await waitFor(() => expect(records.restore).toHaveBeenCalledWith('note-1', 1));
    expect(fixture.toast.success).toHaveBeenCalledWith('Restored as a new revision. Earlier history is preserved.');
  });

  it('advances an acknowledged autosave base without replacing text typed during the request', async () => {
    let acknowledge;
    const pending = new Promise(resolve => { acknowledge = resolve; });
    fixture.state.notes[0].revision = 1;
    fixture.state.updateNote.mockReturnValueOnce(pending).mockResolvedValue({ id: 'note-1', updatedAt: '2026-10-03T00:00:00.000Z', revision: 3 });
    render(<Notes />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Workspace note' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'First change' } });
    await waitFor(() => expect(fixture.state.updateNote).toHaveBeenCalledTimes(1), { timeout: 2500 });
    fireEvent.change(screen.getByRole('textbox', { name: 'Note content' }), { target: { value: 'Newer change' } });
    acknowledge({ id: 'note-1', updatedAt: '2026-10-02T00:00:00.000Z', revision: 2 });
    await waitFor(() => expect(fixture.state.updateNote).toHaveBeenCalledTimes(2), { timeout: 2500 });
    expect(fixture.state.updateNote.mock.calls[1][2]).toEqual({ expectedUpdatedAt: '2026-10-02T00:00:00.000Z', expectedRevision: 2 });
    expect(screen.getByRole('textbox', { name: 'Note content' })).toHaveValue('Newer change');
  });
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
