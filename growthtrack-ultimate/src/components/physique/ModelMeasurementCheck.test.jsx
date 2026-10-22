import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import ModelMeasurementCheck from './ModelMeasurementCheck';
import { registerModelMeasurement } from '../morphEngine/modelMeasurementRuntime';

afterEach(cleanup);
it('isolates Current/Goal and clears results when a model, input or person is replaced', () => {
  const canvas = {}, readCanvas = () => canvas;
  let unregister = registerModelMeasurement(canvas, 'A', { read: () => [{ key: 'waist', label: 'Waist', measured: 90, entered: 82, error: 8 }] });
  const { rerender } = render(<ModelMeasurementCheck context="A" readCanvas={readCanvas} user={{}} />);
  fireEvent.click(screen.getByText('Model fit'));
  fireEvent.click(screen.getByRole('button', { name: 'Check model measurements' }));
  expect(screen.getByText(/Difference: \+8/)).toBeTruthy();
  rerender(<ModelMeasurementCheck context="B" readCanvas={readCanvas} user={{}} />);
  expect(screen.queryByRole('region', { name: 'Model measurement results' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Check model measurements' }).disabled).toBe(true);
  rerender(<ModelMeasurementCheck context="A" readCanvas={readCanvas} user={{}} />);
  act(() => { unregister(); unregister = registerModelMeasurement(canvas, 'A', { read: () => [] }); });
  expect(screen.queryByRole('region', { name: 'Model measurement results' })).toBeNull();
  act(unregister);
});
