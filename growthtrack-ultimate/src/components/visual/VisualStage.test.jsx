import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import VisualStage from './VisualStage';

describe('VisualStage', () => {
  it('applies a domain scene without exposing it to assistive technology', () => {
    const { container } = render(<VisualStage scene="finance" intensity="hero" reducedMotion />);
    const stage = container.querySelector('.v3-visual-stage');
    expect(stage).toHaveAttribute('data-scene', 'finance');
    expect(stage).toHaveAttribute('data-intensity', 'hero');
    expect(stage).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses the overview palette for an unknown scene', () => {
    const { container } = render(<VisualStage scene="unknown" reducedMotion />);
    expect(container.querySelector('.v3-visual-stage')).toHaveStyle({ '--scene-a': '#6d5dfc' });
  });
});

