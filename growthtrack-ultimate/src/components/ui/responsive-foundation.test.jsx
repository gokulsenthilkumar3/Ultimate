import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Tabs from './Tabs';
import PageTemplate, { CommandPage, RecordPage, AnalyticsPage, DetailPage, SettingsPage, ImmersivePage } from './PageTemplate';
import DataTable from './DataTable';
import FilterBar from './FilterBar';
import DetailPanel from './DetailPanel';
import FileUploader from './FileUploader';
import ConnectionCard from './ConnectionCard';
import DraftIndicator from './DraftIndicator';
import FormError from './FormError';

afterEach(cleanup);
const tabs = [{ value: 'a', label: 'Alpha', panelId: 'panel-a' }, { value: 'b', label: 'Beta', disabled: true }, { value: 'c', label: 'Gamma' }];
function TabExample(props) { const [value, setValue] = useState('a'); return <Tabs label="Views" tabs={tabs} value={value} onChange={setValue} {...props} />; }
describe('shared tab keyboard behavior', () => {
  it('wraps arrows, skips disabled tabs, and supports Home/End with focus and selection', () => {
    render(<TabExample />);
    const alpha = screen.getByRole('tab', { name: 'Alpha' }), gamma = screen.getByRole('tab', { name: 'Gamma' });
    alpha.focus(); fireEvent.keyDown(alpha, { key: 'ArrowRight' });
    expect(gamma).toHaveFocus(); expect(gamma).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(gamma, { key: 'ArrowRight' }); expect(alpha).toHaveFocus();
    fireEvent.keyDown(alpha, { key: 'End' }); expect(gamma).toHaveFocus();
    fireEvent.keyDown(gamma, { key: 'Home' }); expect(alpha).toHaveFocus();
    expect(alpha).toHaveAttribute('aria-controls', 'panel-a');
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabindex', '-1');
  });
  it('reverses horizontal arrows in inherited RTL and supports vertical/manual activation', () => {
    const change = vi.fn();
    const view = render(<div dir="rtl"><Tabs label="Views" tabs={[...tabs, { value: 'd', label: 'Delta' }]} value="a" onChange={change} /></div>);
    const alpha = screen.getByRole('tab', { name: 'Alpha' }); alpha.focus();
    fireEvent.keyDown(alpha, { key: 'ArrowRight' }); expect(change).toHaveBeenLastCalledWith('d');
    view.rerender(<Tabs label="Views" tabs={tabs} value="a" onChange={change} orientation="vertical" activation="manual" />);
    change.mockClear(); fireEvent.keyDown(screen.getByRole('tab', { name: 'Alpha' }), { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus(); expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: 'Gamma' })); expect(change).toHaveBeenCalledWith('c');
  });
  it('provides a fallback tab stop and leaves keyboard ownership with callers', () => {
    const handler = vi.fn(), change = vi.fn();
    render(<Tabs label="Views" tabs={tabs} value="b" onChange={change} onKeyDown={handler} />);
    const alpha = screen.getByRole('tab', { name: 'Alpha' });
    expect(alpha).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(alpha, { key: 'ArrowRight' }); expect(handler).toHaveBeenCalledOnce(); expect(change).not.toHaveBeenCalled();
  });
});

describe('functional shared components', () => {
  it.each([CommandPage, RecordPage, AnalyticsPage, DetailPage, SettingsPage, ImmersivePage])('renders template slots with one page heading and no nested main landmark (%#)', _Component => {
    render(<_Component title="Records" summary={<p>Summary</p>} toolbar={<p>Toolbar</p>} aside={<p>Related</p>}><p>Content</p></_Component>);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('complementary')).toHaveAccessibleName('Related information');
    expect(screen.queryByRole('main')).toBeNull();
    ['Summary', 'Toolbar', 'Related', 'Content'].forEach(text => expect(screen.getByText(text)).toBeVisible());
  });
  it('uses the supplied template type', () => {
    render(<PageTemplate type="record" title="Ledger">Ledger content</PageTemplate>);
    expect(screen.getByRole('region', { name: 'Ledger' })).toHaveAttribute('data-template', 'record');
  });
  it('sorts numerical data, preserves inputs, and selects visible rows without dropping hidden selection', async () => {
    const rows = [{ id: 'b', amount: 20 }, { id: 'a', amount: 3 }];
    const selection = vi.fn();
    render(<DataTable caption="Transactions" rows={rows} columns={[{ id: 'amount', header: 'Amount', accessor: row => row.amount, sortable: true }]} rowKey={row => row.id} selectedKeys={['hidden', 'a']} onSelectionChange={selection} />);
    await userEvent.click(screen.getByRole('button', { name: /Amount/ }));
    expect(screen.getByRole('columnheader', { name: /Amount/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(within(screen.getByRole('table')).getAllByRole('row')[1]).toHaveTextContent('3');
    expect(rows[0].id).toBe('b');
    expect(screen.getByRole('region', { name: 'Transactions' })).toHaveAttribute('tabindex', '0');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all visible rows' }));
    expect(selection).toHaveBeenCalledWith(['hidden', 'a', 'b']);
  });
  it('keeps loading/error/empty states distinct and supports retry', async () => {
    const retry = vi.fn();
    const view = render(<DataTable caption="Rows" rows={[]} columns={[]} rowKey={row => row.id} state="loading" />);
    expect(screen.getByText('Loading')).toBeVisible(); expect(screen.queryByText('No records')).toBeNull();
    view.rerender(<DataTable caption="Rows" rows={[]} columns={[]} rowKey={row => row.id} state="error" onRetry={retry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(retry).toHaveBeenCalledOnce();
    view.rerender(<DataTable caption="Rows" rows={[]} columns={[]} rowKey={row => row.id} />);
    expect(screen.getByText('No records')).toBeVisible();
  });
  it('wires query, active filter removal, and reset actions', async () => {
    const change = vi.fn(), remove = vi.fn(), reset = vi.fn();
    render(<FilterBar query="food" onQueryChange={change} resultCount={4} onReset={reset} activeFilters={[{ id: 'food', label: 'Food', onRemove: remove }]} />);
    expect(screen.getByRole('searchbox')).toHaveAccessibleName('Search records');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search records' })); expect(change).toHaveBeenCalledWith('');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Food filter' })); expect(remove).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' })); expect(reset).toHaveBeenCalledOnce();
  });
  it('restores detail drawer focus on Escape and exposes inline details as an aside', async () => {
    function Example() { const [open, setOpen] = useState(false); return <><button onClick={() => setOpen(true)}>Open record</button><DetailPanel open={open} title="Transaction" onClose={() => setOpen(false)}><button>Save</button></DetailPanel></>; }
    const view = render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Open record' }); await userEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Transaction' })).toBeVisible();
    fireEvent.keyDown(document, { key: 'Escape' }); expect(trigger).toHaveFocus(); expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(<DetailPanel open title="Transaction" variant="inline" onClose={() => {}}>Details</DetailPanel>);
    expect(screen.getByRole('complementary', { name: 'Transaction' })).toBeVisible();
  });
  it('validates dropped type, size, count, accepts files, and exposes actual processing failures', async () => {
    const selected = vi.fn();
    const view = render(<FileUploader label="Statement" accept=".csv" maxSizeBytes={4} onFilesSelected={selected} />);
    const drop = files => fireEvent.drop(document.querySelector('.gt-file-uploader'), { dataTransfer: { files } });
    drop([new File(['x'], 'photo.png', { type: 'image/png' })]); expect(screen.getByRole('alert')).toHaveTextContent('supported file type'); expect(selected).not.toHaveBeenCalled();
    drop([new File(['12345'], 'large.csv')]); expect(screen.getByRole('alert')).toHaveTextContent('or smaller');
    drop([new File(['1'], 'a.csv'), new File(['2'], 'b.csv')]); expect(screen.getByRole('alert')).toHaveTextContent('at most 1 file');
    const file = new File(['1'], 'ok.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('Statement'), file);
    expect(selected).toHaveBeenCalledWith([file]); expect(await screen.findByText('1 file selected')).toBeVisible();
    expect(screen.queryByText(/uploaded|connected|success/i)).toBeNull();
    view.rerender(<FileUploader label="Statement" accept=".csv" onFilesSelected={() => Promise.reject(new Error('Provider unavailable'))} />);
    await userEvent.upload(screen.getByLabelText('Statement'), file); expect(await screen.findByRole('alert')).toHaveTextContent('Provider unavailable');
  });
  it('does not manufacture connection or persistence success', async () => {
    const connect = vi.fn(), retry = vi.fn();
    const view = render(<><ConnectionCard title="Bank" status="disconnected" onConnect={connect} /><DraftIndicator status="dirty" /></>);
    await userEvent.click(screen.getByRole('button', { name: 'Connect Bank' })); expect(connect).toHaveBeenCalledOnce();
    expect(screen.getByText('Not connected')).toBeVisible(); expect(screen.getByText('Unsaved changes')).toBeVisible();
    view.rerender(<><ConnectionCard title="Bank" status="error" error="Provider rejected request" onRetry={retry} /><DraftIndicator status="error" onRetry={retry} /></>);
    expect(screen.getByText('Provider rejected request')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Retry save' })); expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByText('Changes saved')).toBeNull();
  });
  it('links a shared form error summary to its invalid field', async () => {
    render(<><label htmlFor="email">Email</label><input id="email" aria-invalid="true" aria-describedby="summary" /><FormError id="summary" errors={[{ fieldId: 'email', message: 'Enter a valid email' }]} /></>);
    await userEvent.click(screen.getByRole('link', { name: 'Enter a valid email' }));
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'summary');
  });
});
