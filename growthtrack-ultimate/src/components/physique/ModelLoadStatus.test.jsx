import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModelLoadStatus from './ModelLoadStatus';

const loading = vi.hoisted(() => ({ active: false, progress: 0, loaded: 0, total: 0 }));
vi.mock('@react-three/drei', () => ({ useProgress: () => loading }));
afterEach(() => { cleanup(); Object.assign(loading, { active: false, progress: 0, loaded: 0, total: 0 }); });

describe('model loading feedback', () => {
  it('shows indeterminate preparation before resources report progress', () => {
    render(<ModelLoadStatus ready={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('Preparing the 3D view');
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('value');
  });
  it('uses reported progress and disappears after the model and resources are ready', () => {
    Object.assign(loading, { active: true, progress: 50, loaded: 1, total: 2 });
    const { rerender } = render(<ModelLoadStatus ready={false} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '50');
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 model resources loaded');
    // Background texture/wardrobe loads must not obscure an already usable model.
    rerender(<ModelLoadStatus ready />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
