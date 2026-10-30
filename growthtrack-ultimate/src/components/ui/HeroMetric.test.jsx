import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import KineticProvider from '../motion/KineticProvider';
import { setKineticPreferences } from '../../hooks/useKineticPreferences';
import HeroMetric from './HeroMetric';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import StatTile from './StatTile';

const kinetic = ui => { setKineticPreferences({ style: 'kinetic', lite: false }); return render(<KineticProvider>{ui}</KineticProvider>); };
const playful = ui => { setKineticPreferences({ style: 'playful', lite: false }); return render(<KineticProvider>{ui}</KineticProvider>); };
afterEach(() => { cleanup(); setKineticPreferences({ style: 'kinetic', lite: false }); });

describe('hero metric', () => {
  it('groups a labelled, grouped whole number with its note and sizes it by character count', () => {
    kinetic(<HeroMetric label="Pending tasks" value={1234} note="3 overdue" />);
    const hero = screen.getByRole('group', { name: 'Pending tasks' });
    expect(within(hero).getAllByText('1,234').length).toBeGreaterThan(0);
    expect(within(hero).getByText('3 overdue')).toBeVisible();
    expect(hero).toHaveStyle({ '--hero-chars': '5' });
  });

  it('shows ready strings and units as given, without counting them up', () => {
    kinetic(<HeroMetric label="Calories today" value="₹1,08,158" unit="kcal" tone="coral" />);
    const hero = screen.getByRole('group', { name: 'Calories today' });
    expect(hero).toHaveAttribute('data-tone', 'coral');
    expect(within(hero).getByText('₹1,08,158')).toBeVisible();
    expect(within(hero).getByText('kcal')).toBeVisible();
  });

  it('shows a real zero, but never invents a figure when there is no value', () => {
    const view = kinetic(<HeroMetric label="Actions waiting" value={0} />);
    expect(within(screen.getByRole('group', { name: 'Actions waiting' })).getAllByText('0').length).toBeGreaterThan(0);
    for (const missing of [undefined, null, '']) {
      view.rerender(<KineticProvider><HeroMetric label="Unread reminders" value={missing} /></KineticProvider>);
      expect(screen.queryByRole('group', { name: 'Unread reminders' })).toBeNull();
    }
  });

  it('renders nothing in Playful, so that presentation is unchanged', () => {
    const view = playful(<HeroMetric label="Pending tasks" value={5} />);
    expect(view.container.querySelector('.hero-metric')).toBeNull();
  });

  it('is one optional prop on PageHeader, placed after the header', () => {
    const view = kinetic(<PageHeader title="Logs" metric={{ label: 'Log entries', value: 42 }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Logs' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Log entries' })).toBeVisible();
    expect(view.container.querySelector('.page-header-block').nextElementSibling).toHaveClass('hero-metric');
    view.unmount();
    const bare = kinetic(<PageHeader title="Logs" />);
    expect(bare.container.querySelector('.hero-metric')).toBeNull();
  });
});

describe('lead tiles and cards', () => {
  it('marks the headline StatCard and fits its figure by character count', () => {
    const view = kinetic(<StatCard label="Net monthly balance" value="-₹8,585" lead />);
    const card = view.container.querySelector('.stat-card');
    expect(card).toHaveClass('stat-card--lead');
    expect(card.style.getPropertyValue('--stat-chars')).toBe('7');
  });

  it('groups whole-number StatCard values and leaves fractions alone', () => {
    kinetic(<StatCard label="Library" value={1500} />);
    expect(screen.getAllByText('1,500').length).toBeGreaterThan(0);
    cleanup();
    kinetic(<StatCard label="Avg rating" value={4.5} />);
    expect(screen.getAllByText('4.5').length).toBeGreaterThan(0);
  });

  it('lets a lead StatTile span the strip, with an icon and caption, and drops the accent bar for the icon', () => {
    const view = kinetic(<StatTile label="Projected Corpus" value="₹99,91,479" color="#10b981" icon={<svg data-testid="glyph" />} sub="last 12d" lead wide />);
    const tile = view.container.querySelector('.stat-tile');
    expect(tile).toHaveClass('stat-tile--lead', 'stat-tile--wide');
    expect(screen.getByTestId('glyph').closest('.stat-tile__icon')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('last 12d')).toHaveClass('stat-tile__sub');
    expect(tile.style.getPropertyValue('--stat-chars')).toBe('10');
  });
});
