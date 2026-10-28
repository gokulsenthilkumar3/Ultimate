import React, { lazy } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import DeferredTools from './DeferredTools';
import ViewportToolbar from './ViewportToolbar';

afterEach(cleanup);

describe('optional avatar tools', () => {
  it('does not fetch closed tools and retains edits after collapsing them', async () => {
    const load = vi.fn(async () => ({ default: () => <input aria-label="Tool draft" defaultValue="" /> }));
    const Tools = lazy(load);
    const { container } = render(<DeferredTools summary="Optional tools"><Tools /></DeferredTools>);
    expect(load).not.toHaveBeenCalled();
    const details = container.querySelector('details');
    details.open = true; fireEvent(details, new Event('toggle'));
    const input = await screen.findByLabelText('Tool draft');
    fireEvent.change(input, { target: { value: 'Keep this draft' } });
    details.open = false; fireEvent(details, new Event('toggle'));
    expect(input).toHaveValue('Keep this draft');
    details.open = true; fireEvent(details, new Event('toggle'));
    expect(screen.getByLabelText('Tool draft')).toBe(input);
    expect(load).toHaveBeenCalledOnce();
  });
});

describe('compact model camera controls', () => {
  it('makes each camera action reachable by name and retains custom camera views', async () => {
    const actions = { onPreset: vi.fn(), onFit: vi.fn(), onReset: vi.fn(), onFace: vi.fn(), onZoomIn: vi.fn(), onZoomOut: vi.fn() };
    render(<ViewportToolbar preset="CUSTOM" presets={[{ id: 'FRONT', label: 'Front' }, { id: 'BACK', label: 'Back' }]} {...actions} />);
    expect(screen.getByRole('combobox', { name: 'Camera angle' })).toHaveValue('CUSTOM');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Camera angle' }), 'BACK');
    expect(actions.onPreset).toHaveBeenCalledWith('BACK');
    for (const [label, action] of [['Fit model', 'onFit'], ['Reset camera', 'onReset'], ['Inspect face', 'onFace'], ['Zoom in', 'onZoomIn'], ['Zoom out', 'onZoomOut']]) {
      await userEvent.click(screen.getByRole('button', { name: label }));
      expect(actions[action]).toHaveBeenCalledOnce();
    }
  });
});
