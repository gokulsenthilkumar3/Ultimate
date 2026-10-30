import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionBudget } from './motionBudget';
import { detectQualityTier, MOTION_LIMITS, tierAfterSample } from '../../hooks/useQualityTier';
import { GlowSprites, resolveCrew } from './GlowCrew';
import KineticProvider from './KineticProvider';
import PageTransition from './PageTransition';
import CharacterScene from './CharacterScene';
import useStore from '../../store/useStore';
import { setKineticPreferences } from '../../hooks/useKineticPreferences';
import { useState } from 'react';
import useDialogFocus, { getActiveDialog } from '../../hooks/useDialogFocus';

afterEach(() => { cleanup(); useStore.setState({ reducedMotion: false }); setKineticPreferences({ style: 'kinetic', lite: false }); });
describe('kinetic admission and quality', () => {
  it('bounds competing tracks, admits priority feedback and reclaims capacity after a tier downgrade', () => {
    const budget = new MotionBudget(12);
    for (let i = 0; i < 20; i++) budget.request(`idle-${i}`, 2);
    expect(budget.active).toBe(12);
    budget.request('feedback', 1, 9);
    expect(budget.has('feedback')).toBe(true);
    expect(budget.active).toBeLessThanOrEqual(12);
    budget.setLimit(3);
    expect(budget.has('feedback')).toBe(true);
    expect(budget.active).toBeLessThanOrEqual(3);
    budget.release('feedback');
    expect(budget.active).toBe(2);
    for (let i = 0; i < 20; i++) budget.release(`idle-${i}`);
    expect(budget.active).toBe(0);
  });
  it('uses conservative hardware limits and downgrades a slow two-second sample one tier', () => {
    expect(detectQualityTier({ cores: 4, memory: 8 })).toBe(0);
    expect(detectQualityTier({ cores: 8, memory: 8 })).toBe(1);
    expect(detectQualityTier({ cores: 12, memory: 16 })).toBe(2);
    expect(detectQualityTier({ cores: 12, memory: 32, saveData: true })).toBe(0);
    expect(MOTION_LIMITS).toEqual([3, 6, 12]);
    expect(tierAfterSample(2, 43)).toBe(1);
    expect(tierAfterSample(1, 120)).toBe(1);
    expect(tierAfterSample(0, 20)).toBe(0);
  });
  it('keeps reusable sprites within the geometry contract and preserves legacy aliases', () => {
    const { container } = render(<GlowSprites />);
    expect(container.querySelectorAll('symbol')).toHaveLength(4);
    container.querySelectorAll('symbol').forEach(sprite => { expect(sprite.querySelectorAll('path').length).toBeLessThanOrEqual(20); expect(sprite.querySelectorAll('g').length).toBeLessThanOrEqual(5); expect(sprite.querySelector('filter')).toBeNull(); });
    expect([resolveCrew('siren'), resolveCrew('snip'), resolveCrew('sunny')]).toEqual(['blip', 'mochi', 'ziggy']);
  });
  it('keeps a focused draft mounted across view changes and stops decorative tracks under reduced motion', async () => {
    useStore.setState({ reducedMotion: true });
    const example = (view: string) => <KineticProvider><PageTransition pageKey="notes"><label>Draft<input aria-label="Draft" defaultValue="" /></label><span>{view}</span><CharacterScene /></PageTransition></KineticProvider>;
    const view = render(example('All'));
    const field = screen.getByRole('textbox', { name: 'Draft' });
    await userEvent.type(field, 'Keep my working text');
    view.rerender(example('Pinned'));
    expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(field);
    expect(field).toHaveValue('Keep my working text'); expect(field).toHaveFocus();
    expect(document.documentElement.dataset.motionTier).toBe('0');
    expect(document.documentElement.dataset.animationCount).toBe('0');
    expect(document.querySelector('.character-scene')).toHaveAttribute('data-animate', 'false');
    view.unmount();
    expect(document.documentElement.dataset.animationCount).toBe('0');
  });
  it('pauses scenes behind the top dialog and resumes them when that dialog closes', async () => {
    function Overlay({ close }: { close: () => void }) {
      const ref = useDialogFocus(true, close);
      return <div role="dialog" aria-label="Example overlay" ref={ref}><CharacterScene kind="nova" /><button onClick={close}>Close example</button></div>;
    }
    function Example() {
      const [open, setOpen] = useState(false);
      return <KineticProvider><div data-testid="background"><CharacterScene kind="blip" /></div><button onClick={() => setOpen(true)}>Open example</button>{open && <Overlay close={() => setOpen(false)} />}</KineticProvider>;
    }
    const view = render(<Example />);
    const background = screen.getByTestId('background').querySelector('.character-scene');
    expect(background).toHaveAttribute('data-animate', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Open example' }));
    expect(background).toHaveAttribute('data-animate', 'false');
    expect(screen.getByRole('dialog').querySelector('.character-scene')).toHaveAttribute('data-animate', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Close example' }));
    expect(background).toHaveAttribute('data-animate', 'true');
    expect(screen.getByRole('button', { name: 'Open example' })).toHaveFocus();
    view.unmount(); expect(getActiveDialog()).toBeNull();
  });
});
