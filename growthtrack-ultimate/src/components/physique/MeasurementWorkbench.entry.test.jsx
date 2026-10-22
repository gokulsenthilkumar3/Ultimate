import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MeasurementWorkbench from './MeasurementWorkbench';

afterEach(cleanup);

it('saves explicit units into the same metric profile and history used by the 3D view', async () => {
  const onSaveProfile = vi.fn().mockResolvedValue(undefined);
  const onSaveSnapshot = vi.fn().mockResolvedValue(undefined);
  render(<MeasurementWorkbench current={{ height: 170 }} user={{}} onSaveProfile={onSaveProfile} onSaveSnapshot={onSaveSnapshot} onInspect={vi.fn()} />);
  const essentials = within(screen.getByRole('group', { name: 'Your essential measurements', hidden: true }));
  fireEvent.change(essentials.getByLabelText('Height (cm)'), { target: { value: '5 ft 10 in' } });
  fireEvent.change(essentials.getByLabelText('Waist (cm)'), { target: { value: '98,5' } });
  // Skip visibility traversal of every help button in collapsed groups, then
  // check the actual submit button's visibility explicitly. Keep the same
  // accessible-name and integration assertions without a larger timeout.
  const submit = screen.getByRole('button', { name: 'Save check-in', hidden: true });
  expect(submit).toBeVisible();
  fireEvent.click(submit);
  await waitFor(() => expect(onSaveSnapshot).toHaveBeenCalledWith(expect.objectContaining({ metrics: { height: 177.8, waist: 98.5 } })));
  expect(onSaveProfile).toHaveBeenCalledOnce();
  expect(await screen.findByRole('status')).toHaveTextContent('Check-in saved');
});
