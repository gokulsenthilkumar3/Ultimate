import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContextFooter from './ContextFooter';

describe('ContextFooter', () => {
  it('reports current context and online readiness', () => {
    render(<ContextFooter activeTab="finance" serverStatus="online" />);
    expect(screen.getByText('Finance / Overview')).toBeVisible();
    expect(screen.getByText('Server connected')).toBeVisible();
  });

  it('makes offline mode explicit', () => {
    render(<ContextFooter activeTab="sleep" serverStatus="offline" />);
    expect(screen.getByText('Server unavailable')).toBeVisible();
  });
});

