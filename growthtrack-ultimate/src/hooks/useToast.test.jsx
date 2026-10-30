import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './useToast';

afterEach(cleanup);
function Example({ review }) {
  const toast = useToast();
  return <><button onClick={() => toast.success('Example change saved.')}>Save example</button><button onClick={() => toast.error('Example service unavailable.')}>Show error</button><button onClick={() => toast.notify('Example review is ready.', { action: { label: 'Review', onClick: review } })}>Show review</button></>;
}

it('keeps confirmation deduplication, errors and notification actions working with the new feedback cards', async () => {
  const user = userEvent.setup(), review = vi.fn();
  render(<ToastProvider><Example review={review} /></ToastProvider>);
  await user.click(screen.getByRole('button', { name: 'Save example' }));
  await user.click(screen.getByRole('button', { name: 'Save example' }));
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('Example change saved.');
  await user.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByRole('status')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Show error' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Example service unavailable.');
  await user.click(screen.getByRole('button', { name: 'Show review' }));
  await user.click(screen.getByRole('button', { name: 'Review' }));
  expect(review).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Example review is ready.')).toBeNull();
});
