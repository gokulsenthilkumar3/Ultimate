import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import useDialogFocus, { getActiveDialog } from './useDialogFocus';

afterEach(cleanup);

function Dialog({ children, onClose = () => {} }) {
  const ref = useDialogFocus(true, onClose);
  return <section role="dialog" aria-label="Example" tabIndex={-1} ref={ref}>{children}</section>;
}

it('wraps Tab around actual tab stops instead of roving result buttons', async () => {
  const user = userEvent.setup();
  render(<><button>Outside before</button><Dialog>
    <input aria-label="Search" data-dialog-autofocus />
    <button>Close search</button>
    <button role="option" tabIndex={-1}>First result</button>
    <button role="option" tabIndex={-1}>Last result</button>
  </Dialog><button>Outside after</button></>);
  const input = screen.getByRole('textbox', { name: 'Search' });
  const close = screen.getByRole('button', { name: 'Close search' });
  expect(input).toHaveFocus();
  await user.tab(); expect(close).toHaveFocus();
  await user.tab(); expect(input).toHaveFocus();
  await user.tab({ shift: true }); expect(close).toHaveFocus();
});

it('skips disabled, hidden and inert targets, including unavailable autofocus', async () => {
  const user = userEvent.setup();
  render(<Dialog>
    <fieldset disabled><input aria-label="Disabled field" data-dialog-autofocus /></fieldset>
    <input type="hidden" />
    <div style={{ display: 'none' }}><button>Hidden by parent</button></div>
    <div hidden><button>Hidden</button></div>
    <div inert><button>Inert</button></div>
    <div aria-hidden="true"><button>Hidden from assistive technology</button></div>
    <button style={{ visibility: 'hidden' }}>Invisible</button>
    <button>Available</button>
    <button tabIndex={-1}>Programmatic only</button>
  </Dialog>);
  const available = screen.getByRole('button', { name: 'Available' });
  expect(available).toHaveFocus();
  await user.tab(); expect(available).toHaveFocus();
  await user.tab({ shift: true }); expect(available).toHaveFocus();
});

it('retains focus in a dialog with no tab stops', async () => {
  const user = userEvent.setup();
  render(<Dialog><button disabled>Saving</button><span data-dialog-autofocus>Wait</span></Dialog>);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveFocus();
  await user.tab(); expect(dialog).toHaveFocus();
  await user.tab({ shift: true }); expect(dialog).toHaveFocus();
});

it('respects consumed Escape and composition, and restores the trigger on close', async () => {
  const user = userEvent.setup();
  const closed = vi.fn();
  function Example() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>Open</button>{open && <Dialog onClose={() => { closed(); setOpen(false); }}>
      <input aria-label="Draft" onKeyDown={event => { if (event.key === 'Escape' && event.altKey) event.preventDefault(); }} />
    </Dialog>}</>;
  }
  render(<Example />);
  const trigger = screen.getByRole('button', { name: 'Open' });
  await user.click(trigger);
  const input = screen.getByRole('textbox', { name: 'Draft' });
  fireEvent.keyDown(input, { key: 'Escape', altKey: true });
  fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
  expect(closed).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(closed).toHaveBeenCalledOnce();
  expect(trigger).toHaveFocus();
  expect(getActiveDialog()).toBeNull();
});
