import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import KineticProvider from '../motion/KineticProvider';
import { setKineticPreferences } from '../../hooks/useKineticPreferences';
import StatTile from './StatTile';
import EmptyState from './EmptyState';

afterEach(() => { cleanup(); setKineticPreferences({ style: 'kinetic', lite: false }); });

describe('stat tiles', () => {
  it('leaves sizing to Kinetic CSS and keeps the data colour as an accent', () => {
    setKineticPreferences({ style: 'kinetic', lite: false });
    render(<KineticProvider><StatTile value="1,234" label="Active" color="#fbbf24" /></KineticProvider>);
    const value = screen.getByText('1,234');
    expect(value).toHaveClass('stat-tile__value');
    expect(value.getAttribute('style')).toBeNull();
    expect(value.parentElement.style.getPropertyValue('--stat-tile-color')).toBe('#fbbf24');
    expect(screen.getByText('Active')).toHaveClass('stat-tile__label');
  });

  it('keeps each page’s original inline scale in Playful', () => {
    setKineticPreferences({ style: 'playful', lite: false });
    render(<KineticProvider><StatTile value="7" label="Done" color="#10b981" size="1.5rem" labelSize="0.62rem" /></KineticProvider>);
    expect(screen.getByText('7')).toHaveStyle({ fontSize: '1.5rem', fontWeight: '900', color: '#10b981' });
    expect(screen.getByText('Done')).toHaveStyle({ fontSize: '0.62rem' });
  });
});

describe('empty state companion', () => {
  it('shows Nova in Kinetic and keeps the icon elsewhere', () => {
    setKineticPreferences({ style: 'kinetic', lite: false });
    const view = render(<KineticProvider><EmptyState title="Nothing yet" description="Add one." /></KineticProvider>);
    expect(view.container.querySelector('.empty-state__companion .character-scene')).not.toBeNull();
    expect(view.container.querySelector('.empty-state__icon')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Nothing yet' })).toBeVisible();
    view.unmount();
    setKineticPreferences({ style: 'playful', lite: false });
    const playful = render(<KineticProvider><EmptyState title="Nothing yet" /></KineticProvider>);
    expect(playful.container.querySelector('.empty-state__icon')).not.toBeNull();
    expect(playful.container.querySelector('.empty-state__companion')).toBeNull();
  });
});
