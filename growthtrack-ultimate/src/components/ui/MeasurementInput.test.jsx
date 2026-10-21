import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MeasurementInput from './MeasurementInput';
import { parseMetricEntry, stepMetricEntry } from '../../lib/measurementEntry';

afterEach(cleanup);

describe('measurements connected to the avatar', () => {
  it.each([
    ['height', '5 ft 10 in', 'cm', '177.8'],
    ['waist', '98,5 cm', 'cm', '98.5'],
    ['weight', '180 lb', 'kg', '81.646627'],
    ['waist', '32', 'in', '81.28'],
    ['bodyFat', '18,5%', '%', '18.5'],
    ['pelvicTilt', '-12.5°', 'deg', '-12.5'],
  ])('commits %s in storage units from %s', (metricKey, text, unit, expected) => {
    const onCommit = vi.fn();
    render(<MeasurementInput metricKey={metricKey} unit={unit} value={null} onCommit={onCommit} aria-label="Measurement" />);
    const field = screen.getByRole('textbox');
    fireEvent.change(field, { target: { value: text } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(field);
    expect(onCommit).toHaveBeenCalledWith(expected);
  });

  it('rejects 400 cm and keeps both the draft and avatar value intact', () => {
    const onCommit = vi.fn();
    render(<MeasurementInput metricKey="height" value={175} onCommit={onCommit} aria-label="Height" aria-describedby="help" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '400 cm' } });
    fireEvent.blur(screen.getByRole('textbox'));
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('90–250 cm');
    expect(screen.getByRole('textbox')).toHaveValue('400 cm');
    expect(screen.getByRole('textbox').getAttribute('aria-describedby')).toContain('help');
  });

  it('steps a draft, supports Escape, and refreshes after an external profile change', () => {
    const onCommit = vi.fn();
    const view = render(<MeasurementInput metricKey="waist" value={90} onCommit={onCommit} aria-label="Waist" />);
    const field = screen.getByRole('textbox');
    fireEvent.keyDown(field, { key: 'ArrowDown', shiftKey: true });
    expect(field).toHaveValue('85');
    fireEvent.keyDown(field, { key: 'PageUp' });
    expect(field).toHaveValue('87.5');
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(field).toHaveValue('90');
    fireEvent.blur(field);
    expect(onCommit).not.toHaveBeenCalled();
    view.rerender(<MeasurementInput metricKey="waist" value={88} onCommit={onCommit} aria-label="Waist" />);
    expect(field).toHaveValue('88');
  });

  it('commits on Enter once and does not accidentally submit a surrounding form', () => {
    const onCommit = vi.fn();
    render(<MeasurementInput metricKey="height" value={175} onCommit={onCommit} aria-label="Height" />);
    const field = screen.getByRole('textbox');
    field.focus();
    fireEvent.change(field, { target: { value: '180' } });
    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(false);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('180');
  });

  it('does not interpret blank, incompatible, infinite or malformed input as measurements', () => {
    for (const input of ['', ' ', '32 kg', '1e999', '1,2,3', 'NaN']) {
      expect(parseMetricEntry('waist', input, 'cm').valid).toBe(false);
    }
    expect(stepMetricEntry('height', '250', 'cm', { key: 'ArrowUp' })).toBeNull();
    expect(stepMetricEntry('height', '', 'cm', { key: 'ArrowUp' })).toBeNull();
  });
});
