import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TextField from '../components/ui/TextField';
import SelectField from '../components/ui/SelectField';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import DatePicker from '../components/ui/StunningDatePicker';
import { ApiClient } from '../lib/apiClient';
import { uiMessages } from '../lib/uiMessages';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { UploadModal } from '../components/Documents';

describe('interface regressions', () => {
  it('focuses the safe action when confirming deletion', () => {
    render(<ConfirmDialog open title="Delete record?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
  it('keeps a failed file record open and allows retry', async () => {
    const save = vi.fn().mockRejectedValue(new Error('network'));
    const close = vi.fn();
    const { container } = render(<UploadModal onUpload={save} onClose={close} />);
    await userEvent.upload(container.querySelector('input[type=file]'), new File(['example'], 'notes.txt'));
    await userEvent.click(screen.getByRole('button', { name: 'Save file record' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection and try again');
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save file record' })).toBeEnabled();
  });
  it.each([TextField, SelectField])('preserves external and validation descriptions', Field => {
    render(<><p id="outside">Additional instructions</p>{React.createElement(Field, { label: 'Value', hint: 'Hint', error: 'Fix this field', 'aria-describedby': 'outside', 'aria-invalid': false })}</>);
    const field = screen.getByLabelText('Value');
    expect(field).toHaveAccessibleDescription('Additional instructions Hint Fix this field');
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });
  it('blocks duplicate submission during loading', async () => {
    const click = vi.fn();
    render(<Button loading loadingLabel="Saving changes…" onClick={click}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Saving changes…' }));
    expect(click).not.toHaveBeenCalled();
  });
  it('activates a button with the keyboard', async () => {
    const click = vi.fn();
    render(<Button onClick={click}>Continue</Button>);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(click).toHaveBeenCalledTimes(1);
  });
  it('preserves date-only values and native constraints', () => {
    const change = vi.fn();
    render(<DatePicker label="Birth date" value="2000-02-29" max="2026-09-12" onChange={change} />);
    const input = screen.getByLabelText('Birth date');
    expect(input).toHaveValue('2000-02-29');
    expect(input).toHaveAttribute('max', '2026-09-12');
    fireEvent.change(input, { target: { value: '2001-03-01' } });
    expect(change).toHaveBeenCalledWith('2001-03-01');
  });
  it('only closes the top dialog and retains scroll lock until all close', async () => {
    function Stack() {
      const [first, setFirst] = useState(true), [second, setSecond] = useState(true);
      return <><Modal open={first} title="First" onClose={() => setFirst(false)}>First body</Modal><Modal open={second} title="Second" onClose={() => setSecond(false)}>Second body</Modal></>;
    }
    render(<Stack />);
    expect(screen.getByRole('dialog', { name: 'First' })).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Second' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Second' })).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
  it('keeps server internals in diagnostics and uses actionable copy', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"SQL secret stack"}', { status: 500 }));
    try {
      await expect(new ApiClient({ retries: 0 }).get('/test')).rejects.toMatchObject({ message: uiMessages.server, payload: { error: 'SQL secret stack' } });
    } finally { fetch.mockRestore(); }
  });
  it('does not retry writes after a connection failure', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    try {
      await expect(new ApiClient().post('/test', {})).rejects.toThrow(uiMessages.connection);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { fetch.mockRestore(); }
  });
  it('does not send a request that was already cancelled', async () => {
    const controller = new AbortController(); controller.abort();
    const fetch = vi.spyOn(globalThis, 'fetch');
    try {
      await expect(new ApiClient().get('/test', { signal: controller.signal })).rejects.toThrow(uiMessages.cancelled);
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
});
