import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignOutDialog from './SignOutDialog';

afterEach(cleanup);
const props = () => ({ open: true, drafts: { available: true, count: 2 }, busy: false, error: '', onCancel: vi.fn(), onConfirm: vi.fn() });

describe('illustrated sign-out choices', () => {
  it('starts with keep, makes removal an explicit choice, and resets that choice on reopening', async () => {
    const user = userEvent.setup(), handlers = props();
    const view = render(<SignOutDialog {...handlers} />);
    expect(screen.getByRole('button', { name: 'Stay signed in' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: /^Keep my drafts/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /^Remove local drafts/ }));
    await user.click(screen.getByRole('button', { name: 'Sign out & remove drafts' }));
    expect(handlers.onConfirm).toHaveBeenCalledWith(true);
    view.rerender(<SignOutDialog {...handlers} open={false} />);
    view.rerender(<SignOutDialog {...handlers} />);
    expect(screen.getByRole('radio', { name: /^Keep my drafts/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Sign out', exact: true }));
    expect(handlers.onConfirm).toHaveBeenLastCalledWith(false);
  });

  it.each([{ available: false, count: 0 }, { available: true, count: 0 }])('keeps removal unavailable when draft information is %j', async drafts => {
    const handlers = props();
    render(<SignOutDialog {...handlers} drafts={drafts} />);
    expect(screen.queryByRole('radio')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out', exact: true }));
    expect(handlers.onConfirm).toHaveBeenCalledWith(false);
  });

  it('blocks all dismissal and choice actions during sign-out without removing the dialog', async () => {
    const handlers = props();
    render(<SignOutDialog {...handlers} busy />);
    const dialog = screen.getByRole('dialog', { name: 'Ready to sign out?' });
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    within(dialog).getAllByRole('button').forEach(button => expect(button).toBeDisabled());
    within(dialog).getAllByRole('radio').forEach(radio => expect(radio).toBeDisabled());
    await userEvent.keyboard('{Escape}');
    await userEvent.click(document.querySelector('.gt-modal-backdrop'));
    expect(handlers.onCancel).not.toHaveBeenCalled();
    expect(handlers.onConfirm).not.toHaveBeenCalled();
    expect(dialog).toBeInTheDocument();
  });

  it('shows a retryable error without clearing the user’s current draft choice', async () => {
    const handlers = props(), view = render(<SignOutDialog {...handlers} />);
    await userEvent.click(screen.getByRole('radio', { name: /^Remove local drafts/ }));
    view.rerender(<SignOutDialog {...handlers} error="Sign-out could not be completed." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-out could not be completed.');
    expect(screen.getByRole('radio', { name: /^Remove local drafts/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Sign out & remove drafts' })).toBeEnabled();
  });
});
