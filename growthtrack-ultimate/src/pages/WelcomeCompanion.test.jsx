import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WelcomeCompanion from './WelcomeCompanion';
import useSceneMotion from '../hooks/useSceneMotion';
import { KineticContext } from '../components/motion/KineticContext';

vi.mock('../hooks/useSceneMotion', () => ({ default: vi.fn() }));

const scene = () => <KineticContext.Provider value={{ enabled: true, canAnimate: true, tier: 2, budget: null }}><WelcomeCompanion /></KineticContext.Provider>;
beforeEach(() => { vi.useFakeTimers(); useSceneMotion.mockReturnValue(true); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe('welcome companion choreography', () => {
  it('lets the same gesture replay without moving keyboard focus or changing the selection', () => {
    const { container } = render(scene());
    const hello = screen.getByRole('button', { name: 'Say hello' });
    hello.focus();
    fireEvent.click(hello);
    const firstGesture = container.querySelector('.welcome-companion__gesture');
    act(() => vi.advanceTimersByTime(400));
    fireEvent.click(hello);
    expect(hello).toHaveFocus();
    expect(hello).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.welcome-companion__gesture')).not.toBe(firstGesture);
    expect(container.querySelectorAll('.personal-companion')).toHaveLength(1);
    expect(screen.getByText('Hello, you. There’s room for you here.')).toBeVisible();
  });

  it('bounds rapid pose changes to two layers and removes the outgoing pose', () => {
    const { container } = render(scene());
    for (const name of ['Say hello', 'Listen', 'Celebrate', 'At ease', 'Celebrate']) {
      fireEvent.click(screen.getByRole('button', { name }));
      expect(container.querySelectorAll('.personal-companion')).toHaveLength(2);
      act(() => vi.advanceTimersByTime(50));
    }
    expect(container.querySelector('.welcome-companion__pose .personal-companion')).toHaveAttribute('data-pose', 'celebrate');
    act(() => vi.advanceTimersByTime(400));
    expect(container.querySelector('.welcome-companion__outgoing')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.personal-companion')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('drops the outgoing layer when motion stops and preserves the chosen pose on resume', () => {
    const view = render(scene());
    fireEvent.click(screen.getByRole('button', { name: 'Listen' }));
    expect(view.container.querySelector('.welcome-companion__outgoing')).toBeInTheDocument();
    useSceneMotion.mockReturnValue(false);
    view.rerender(scene());
    expect(view.container.querySelector('.welcome-companion')).toHaveAttribute('data-animate', 'false');
    expect(view.container.querySelector('.welcome-companion__outgoing')).not.toBeInTheDocument();
    act(() => vi.runOnlyPendingTimers());
    useSceneMotion.mockReturnValue(true);
    view.rerender(scene());
    expect(view.container.querySelectorAll('.personal-companion')).toHaveLength(1);
    expect(view.container.querySelector('.personal-companion')).toHaveAttribute('data-pose', 'listen');
  });

  it('keeps static pose selection immediate and cleans pending work on unmount', () => {
    useSceneMotion.mockReturnValue(false);
    const view = render(scene());
    fireEvent.click(screen.getByRole('button', { name: 'Celebrate' }));
    expect(view.container.querySelectorAll('.personal-companion')).toHaveLength(1);
    expect(view.container.querySelector('.personal-companion')).toHaveAttribute('data-pose', 'celebrate');
    expect(vi.getTimerCount()).toBe(0);
    useSceneMotion.mockReturnValue(true);
    view.rerender(scene());
    fireEvent.click(screen.getByRole('button', { name: 'Say hello' }));
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
