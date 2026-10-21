import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AvatarStudio from '../components/AvatarStudio';

describe('avatar creation flow', () => {
  it('requires height and does not mutate the current body while drafting', async () => {
    const apply = vi.fn();
    render(<AvatarStudio current={{}} onApply={apply} onCustomize={() => {}} onSnapshot={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create / edit my avatar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply and customize' }));
    await screen.findByText(/Enter a valid height/);
    expect(apply).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Height in centimetres'), { target: { value: '180' } });
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply and customize' }));
    await waitFor(() => expect(apply).toHaveBeenCalledWith(expect.objectContaining({ height: 180 })));
  });
  it('undoes edits without changing the displayed baseline', () => {
    render(<AvatarStudio current={{ height: 175 }} onApply={() => {}} onCustomize={() => {}} onSnapshot={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create / edit my avatar' }));
    fireEvent.change(screen.getByLabelText('Height in centimetres'), { target: { value: '185' } });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Height in centimetres')).toHaveValue(175);
  });
});
