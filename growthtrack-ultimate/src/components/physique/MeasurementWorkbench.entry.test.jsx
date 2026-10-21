import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MeasurementWorkbench from './MeasurementWorkbench';

afterEach(cleanup);

it('saves explicit units into the same metric profile and history used by the 3D view', async () => {
  const onSaveProfile = vi.fn().mockResolvedValue(undefined);
  const onSaveSnapshot = vi.fn().mockResolvedValue(undefined);
  render(<MeasurementWorkbench current={{ height: 170 }} user={{}} onSaveProfile={onSaveProfile} onSaveSnapshot={onSaveSnapshot} onInspect={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '5 ft 10 in' } });
  fireEvent.change(screen.getByLabelText('Waist (cm)'), { target: { value: '98,5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));
  await waitFor(() => expect(onSaveSnapshot).toHaveBeenCalledWith(expect.objectContaining({ metrics: { height: 177.8, waist: 98.5 } })));
  expect(onSaveProfile).toHaveBeenCalledOnce();
  expect(screen.getByRole('status')).toHaveTextContent('Check-in saved');
});
