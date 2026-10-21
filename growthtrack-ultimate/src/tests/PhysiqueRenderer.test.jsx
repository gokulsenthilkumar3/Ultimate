import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { probeWebGL } from '../lib/webglCapability';
import PhysiqueRenderer from '../components/PhysiqueRenderer';

vi.mock('../lib/webglCapability', () => ({ probeWebGL: vi.fn() }));
vi.mock('../components/ChamberCanvas', () => ({ default: () => <div>3D renderer mounted</div> }));
vi.mock('../components/Sprite3DViewer', () => ({ default: () => <div>2D renderer mounted</div> }));
vi.mock('../store/use3DStore', () => {
  const state = { rendererQualityTelemetry: { status: 'pending' }, setRendererQualityTelemetry: vi.fn() };
  const store = selector => selector(state);
  store.getState = () => state;
  return { default: store };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Physique fallback', () => {
  it('never mounts the 3D renderer if the capability probe fails', async () => {
    probeWebGL.mockReturnValue(false);
    render(<PhysiqueRenderer />);
    expect(await screen.findByText('2D renderer mounted')).toBeInTheDocument();
    expect(screen.queryByText('3D renderer mounted')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry 3D' }));
    expect(screen.queryByText('3D renderer mounted')).not.toBeInTheDocument();
  });
  it('only retries 3D after a successful new probe', async () => {
    probeWebGL.mockReturnValue(false);
    render(<PhysiqueRenderer />);
    await screen.findByText('2D renderer mounted');
    probeWebGL.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry 3D' }));
    expect(await screen.findByText('3D renderer mounted')).toBeInTheDocument();
  });
});
