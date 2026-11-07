import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FamilyInterchange from './FamilyInterchange';
import { decodeGedcom } from './gedcomFile';
import { familyRequest } from './familyClient';

vi.mock('./familyClient', () => ({ familyRequest: vi.fn() }));
const account = { owner: 'fixture-owner', authMode: 'ultimate', user: { id: 'fixture-family' } }, clients = [];
const TEXT = '0 HEAD\n0 @I1@ INDI\n1 NAME Fictional /Person/\n0 TRLR\n';
const preview = (changes = {}) => ({
  canImport: true, stats: { people: 3, families: 1, relationships: 2 }, errors: [], warnings: ['One note'], warningCount: 1, ignored: { OBJE: 2 },
  sample: [{ ref: '@I1@', name: 'Fictional One' }, { ref: '@I2@', name: 'Fictional Two' }], duplicates: { count: 0, checked: true, rows: [] }, ...changes,
});
function show(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client); const invalidate = vi.spyOn(client, 'invalidateQueries');
  return { invalidate, ...render(<QueryClientProvider client={client}><FamilyInterchange account={account} treeId="tree/a" edit {...props} /></QueryClientProvider>) };
}
function file(name = 'family.ged', text = TEXT, size) {
  const value = new File([text], name, { type: 'text/plain' });
  Object.defineProperty(value, 'arrayBuffer', { value: async () => new TextEncoder().encode(text).buffer });
  if (size) Object.defineProperty(value, 'size', { value: size });
  return value;
}
const choose = (value) => fireEvent.change(screen.getByLabelText(/GEDCOM file/), { target: { files: [value] } });

beforeEach(() => { vi.mocked(familyRequest).mockReset(); URL.createObjectURL = vi.fn(() => 'blob:fixture'); URL.revokeObjectURL = vi.fn(); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); });

describe('GEDCOM export', () => {
  it('downloads the file and says what GEDCOM could not carry', async () => {
    vi.mocked(familyRequest).mockResolvedValue({ filename: 'Our-Family.ged', mediaType: 'text/plain;charset=utf-8', gedcom: '0 HEAD\r\n0 TRLR\r\n', summary: { people: 4, families: 1, omitted: { cousin: 2, extra_parents: 1 } } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    show();
    fireEvent.click(screen.getByRole('button', { name: /Export GEDCOM/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Exported 4 people as GEDCOM. 3 connections that GEDCOM cannot express (cousin 2, extra parents 1) were left out.');
    expect(familyRequest).toHaveBeenCalledWith('/trees/tree%2Fa/export/gedcom', { connection: account });
    expect(click).toHaveBeenCalledOnce(); expect(URL.createObjectURL).toHaveBeenCalledOnce();
    click.mockRestore();
  });

  it('explains mixed adoption status separately from connections that were left out', async () => {
    vi.mocked(familyRequest).mockResolvedValue({ filename: 'Our-Family.ged', gedcom: '0 HEAD\r\n0 TRLR\r\n', summary: { people: 1, families: 0, omitted: { mixed_pedigree: 2 } } });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    show(); fireEvent.click(screen.getByRole('button', { name: /Export GEDCOM/ }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Exported 1 person as GEDCOM. 2 children had parents with different adoption status; GEDCOM records that per child, so it was not exported.');
    expect(status).not.toHaveTextContent('left out'); click.mockRestore();
  });

  it('shows a failure instead of a download', async () => {
    vi.mocked(familyRequest).mockRejectedValue(Object.assign(new Error('This tree is larger than the export limit.'), { status: 413 }));
    show(); fireEvent.click(screen.getByRole('button', { name: /Export GEDCOM/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('larger than the export limit'); expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('offers export but not import to people who cannot edit', () => {
    show({ edit: false });
    expect(screen.getByRole('button', { name: /Export GEDCOM/ })).toBeEnabled(); expect(screen.queryByRole('button', { name: /Import GEDCOM/ })).toBeNull();
    expect(screen.getByText(/Editors and family heads can import/)).toBeInTheDocument();
  });
});

describe('GEDCOM import review', () => {
  it('previews first, writes only on confirmation, then refreshes Family data', async () => {
    vi.mocked(familyRequest).mockResolvedValueOnce(preview()).mockResolvedValueOnce({ imported: { people: 3, relationships: 2 }, warningCount: 1, warnings: ['One note'], ignored: {} });
    const { invalidate } = show(); choose(file());
    expect(await screen.findByText(/Found 3 people and 2 connections/)).toHaveTextContent('starting with Fictional One, Fictional Two');
    expect(familyRequest).toHaveBeenCalledTimes(1);
    expect(familyRequest).toHaveBeenLastCalledWith('/trees/tree%2Fa/import/gedcom/preview', { connection: account, method: 'POST', body: { text: TEXT } });
    expect(screen.getByText('1 note to review')).toBeInTheDocument(); expect(screen.getByText(/Not imported: OBJE ×2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import 3 people' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Imported 3 people and 2 connections. 1 note to review. Existing people were not changed.');
    expect(familyRequest).toHaveBeenLastCalledWith('/trees/tree%2Fa/import/gedcom', { connection: account, method: 'POST', body: { text: TEXT, idempotencyKey: expect.stringMatching(/^[A-Za-z0-9_-]{8,100}$/) } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['native-family', 'fixture-owner', 'fixture-family'] });
    expect(screen.queryByText(/Found 3 people/)).toBeNull();
  });

  it('keeps import disabled for invalid files and shows why', async () => {
    vi.mocked(familyRequest).mockResolvedValueOnce(preview({ canImport: false, errors: ['No people were found in this file.'], stats: { people: 0, families: 0, relationships: 0 }, sample: [] }));
    show(); choose(file());
    expect(await screen.findByRole('alert')).toHaveTextContent('No people were found'); expect(screen.getByRole('button', { name: 'Import 0 people' })).toBeDisabled();
  });

  it('requires an explicit choice before importing probable duplicates', async () => {
    vi.mocked(familyRequest).mockResolvedValueOnce(preview({ duplicates: { count: 2, checked: true, rows: [{ ref: '@I1@', name: 'Fictional One', existingId: 'x' }, { ref: '@I2@', name: 'Fictional Two', existingId: 'y' }] } }))
      .mockResolvedValueOnce({ imported: { people: 3, relationships: 2 }, warningCount: 0, warnings: [], ignored: {} });
    show(); choose(file());
    expect(await screen.findByText(/2 people look like someone already in this tree: Fictional One, Fictional Two/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Import 3 people' }); expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Import them anyway/ })); expect(button).toBeEnabled(); fireEvent.click(button);
    await waitFor(() => expect(familyRequest).toHaveBeenLastCalledWith('/trees/tree%2Fa/import/gedcom', { connection: account, method: 'POST', body: { text: TEXT, idempotencyKey: expect.any(String), allowDuplicates: true } }));
  });

  it('reuses one retry key for a review so pressing Import again cannot import twice, and reports a replay honestly', async () => {
    vi.mocked(familyRequest).mockResolvedValueOnce(preview()).mockRejectedValueOnce(Object.assign(new Error('The Family request timed out. Review before retrying a change.'), { status: 0 }))
      .mockResolvedValueOnce({ imported: { people: 3, relationships: 2 }, warningCount: 0, warnings: [], ignored: {}, replayed: true });
    show(); choose(file()); fireEvent.click(await screen.findByRole('button', { name: 'Import 3 people' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('timed out'); fireEvent.click(screen.getByRole('button', { name: 'Import 3 people' }));
    expect(await screen.findByRole('status')).toHaveTextContent('This import had already finished, so nothing was added twice. Imported 3 people');
    const keys = vi.mocked(familyRequest).mock.calls.filter(([path]) => path.endsWith('/import/gedcom')).map(([, options]) => options.body.idempotencyKey);
    expect(keys).toHaveLength(2); expect(keys[0]).toMatch(/^[A-Za-z0-9_-]{8,100}$/); expect(keys[1]).toBe(keys[0]);
  });

  it('rejects wrong or oversized files before any request and lets the editor cancel a review', async () => {
    show(); choose(file('photos.zip')); expect(await screen.findByRole('alert')).toHaveTextContent('Choose a .ged file up to 1 MB');
    choose(file('big.ged', TEXT, 1024 * 1024 + 1)); expect(screen.getByRole('alert')).toHaveTextContent('up to 1 MB'); expect(familyRequest).not.toHaveBeenCalled();
    vi.mocked(familyRequest).mockResolvedValueOnce(preview()); choose(file());
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' })); expect(screen.queryByText(/Found 3 people/)).toBeNull();
  });

  it('shows a server refusal and leaves the review open so nothing is retried automatically', async () => {
    vi.mocked(familyRequest).mockResolvedValueOnce(preview()).mockRejectedValueOnce(Object.assign(new Error('Family request limit reached. Wait 30 seconds before trying again.'), { status: 429 }));
    show(); choose(file()); fireEvent.click(await screen.findByRole('button', { name: 'Import 3 people' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wait 30 seconds'); expect(familyRequest).toHaveBeenCalledTimes(2); expect(screen.getByRole('button', { name: 'Import 3 people' })).toBeEnabled();
  });
});

describe('file decoding', () => {
  it('reads UTF-8 with or without a byte-order mark, and UTF-16 files from other tools', () => {
    const utf8 = text => new TextEncoder().encode(text).buffer;
    expect(decodeGedcom(utf8('0 HEAD கோகுல்'))).toBe('0 HEAD கோகுல்');
    expect(decodeGedcom(new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('0 HEAD')]).buffer)).toBe('0 HEAD');
    const le = new Uint8Array([0xff, 0xfe, ...[...'0 HEAD'].flatMap(char => [char.charCodeAt(0), 0])]);
    const be = new Uint8Array([0xfe, 0xff, ...[...'0 HEAD'].flatMap(char => [0, char.charCodeAt(0)])]);
    expect(decodeGedcom(le.buffer)).toBe('0 HEAD'); expect(decodeGedcom(be.buffer)).toBe('0 HEAD');
  });
});
