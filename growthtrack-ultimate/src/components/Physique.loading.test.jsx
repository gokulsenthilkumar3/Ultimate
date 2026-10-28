import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Physique from './Physique';

const model = vi.hoisted(() => ({ measurementMount: vi.fn(), targetsMount: vi.fn(), historyMount: vi.fn() }));
vi.mock('../store/useStore', () => ({ default: selector => selector({ user: { id: 'owner' }, bodyProfile: {}, physiqueTargets: {}, metric_logs: [] }) }));
vi.mock('../store/use3DStore', () => ({ default: { getState: () => ({}) } }));
vi.mock('../hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('./ScrollShowcase', () => ({ default: () => <p>Interactive model workspace</p> }));
vi.mock('./physique/MeasurementWorkbench', () => ({ default: function MeasurementMock() {
  React.useEffect(() => { model.measurementMount(); }, []);
  return <input aria-label="Draft measurement" defaultValue="" />;
} }));
vi.mock('./physique/TargetWorkbench', () => ({ default: function TargetMock() { model.targetsMount(); return <p>Targets workbench</p>; } }));
vi.mock('./physique/PhysiqueHistory', () => ({ default: function HistoryMock() { model.historyMount(); return <p>Check-in history</p>; } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Physique route loading boundaries', () => {
  it('opens 3D without mounting hidden workbenches, then preserves an edited tab when returning to 3D', async () => {
    render(<MemoryRouter initialEntries={['/wellness/physique?view=3d']}><Physique /></MemoryRouter>);
    await screen.findByText('Interactive model workspace');
    expect(model.measurementMount).not.toHaveBeenCalled();
    expect(model.targetsMount).not.toHaveBeenCalled();
    expect(model.historyMount).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: /^Measurements/ }));
    const input = await screen.findByLabelText('Draft measurement');
    fireEvent.change(input, { target: { value: '82.5' } });
    fireEvent.click(screen.getByRole('tab', { name: /^3D Mirror/ }));
    await screen.findByText('Interactive model workspace');
    expect(input).toHaveValue('82.5');
    expect(input.closest('section')).toHaveAttribute('hidden');
    fireEvent.click(screen.getByRole('tab', { name: /^Measurements/ }));
    expect(screen.getByLabelText('Draft measurement')).toBe(input);
    expect(model.measurementMount).toHaveBeenCalledOnce();
  });
});
