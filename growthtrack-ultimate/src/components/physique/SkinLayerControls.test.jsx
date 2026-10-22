import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SkinLayerControls from './SkinLayerControls';

afterEach(cleanup);
it('labels the saved coverage choice, clamps malformed drafts and keeps reset atomic', () => {
  const onChange = vi.fn(), onReset = vi.fn();
  render(<SkinLayerControls metrics={{ skinTan: 9, skinFlush: 'bad', skinTanPattern: 'unknown' }} onChange={onChange} onReset={onReset} />);
  expect(screen.getByRole('slider', { name: 'Tan amount' }).value).toBe('1');
  expect(screen.getByRole('slider', { name: 'Skin flush' }).value).toBe('0');
  expect(screen.getByRole('combobox', { name: 'Tan-line pattern' }).value).toBe('none');
  fireEvent.change(screen.getByRole('combobox', { name: 'Tan-line pattern' }), { target: { value: 'tank' } });
  expect(onChange).toHaveBeenLastCalledWith('skinTanPattern', 'tank');
  fireEvent.click(screen.getByRole('button', { name: 'Reset tan, flush & undertone' }));
  expect(onReset).toHaveBeenCalledOnce();
  expect(onChange).toHaveBeenCalledTimes(1);
});
