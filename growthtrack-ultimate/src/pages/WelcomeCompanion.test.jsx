import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WelcomeCompanion from './WelcomeCompanion';

const state = vi.hoisted(() => ({ props: null, motion: true }));
beforeEach(() => { Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }); });
vi.mock('../components/motion/KineticContext', () => ({ useKinetic: () => ({ canAnimate: state.motion, tier: 2 }) }));
vi.mock('../components/motion/ProceduralStage', () => ({ default: props => { state.props = props; return <span data-testid="welcome-scene" data-kind={props.kind}>{props.children}</span>; } }));
afterEach(() => { cleanup(); state.motion = true; });
const show = () => render(<MemoryRouter><WelcomeCompanion /></MemoryRouter>);

describe('explorable welcome world', () => {
  it('previews every place without inventing a visit or requiring WebGL', () => {
    const { container } = show();
    const focus = screen.getByRole('button', { name: /Focus Studio/ }); focus.focus(); fireEvent.click(focus);
    expect(focus).toHaveFocus(); expect(focus).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Focus Studio' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Find your next task/ })).toHaveAttribute('href', '/workspace/tasks');
    expect(screen.getByLabelText('0 of 3 tour places discovered')).toBeVisible();
    expect(screen.getByRole('button', { name: /Pilot Pebble/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Quiet Garden/ }));
    expect(screen.getByRole('heading', { name: 'Quiet Garden' })).toBeVisible();
    expect(container.querySelector('.agent-kite, .personal-companion, img')).toBeNull();
    expect(container.querySelector('.world-poster')).not.toBeNull();
  });
  it('counts only acknowledged in-world discoveries, once per place', () => {
    show();
    act(() => { state.props.onSceneEvent({ type: 'discover', id: 'life' }); state.props.onSceneEvent({ type: 'discover', id: 'life' }); state.props.onSceneEvent({ type: 'discover', id: 'unknown' }); });
    expect(screen.getByLabelText('1 of 3 tour places discovered')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Life Observatory' })).toBeVisible();
  });
  it('captures driving keys only inside the focused world and releases them on Escape', () => {
    show(); act(() => state.props.onStatusChange('ready'));
    fireEvent.click(screen.getByRole('button', { name: /Pilot Pebble/ }));
    const world = screen.getByRole('group', { name: '3D island exploration area' }); expect(world).toHaveFocus();
    fireEvent.keyDown(world, { key: 'w' }); expect(state.props.controller.current.keys.has('w')).toBe(true);
    fireEvent.keyUp(world, { key: 'w' }); expect(state.props.controller.current.keys.size).toBe(0);
    fireEvent.keyDown(world, { key: 'ArrowUp' });
    fireEvent.keyDown(world, { key: 'Escape' }); expect(state.props.controller.current.keys.size).toBe(0); expect(world).not.toHaveFocus();
    fireEvent.keyDown(document, { key: 'w' }); expect(state.props.controller.current.keys.size).toBe(0);
  });
  it('guides acknowledged arrivals through all places and completes only actual discoveries', () => {
    show(); act(() => { state.props.onStatusChange('ready'); state.props.onActiveChange(true); });
    fireEvent.click(screen.getByRole('button', { name: 'Start guided journey' }));
    expect(state.props.controller.current.target.x).toBeLessThan(0);
    act(() => { state.props.onSceneEvent({ type: 'discover', id: 'work' }); state.props.onSceneEvent({ type: 'arrive', id: 'work' }); });
    expect(state.props.controller.current.target.x).toBeGreaterThan(0);
    expect(screen.getByLabelText('1 of 3 tour places discovered')).toBeVisible();
    act(() => { state.props.onSceneEvent({ type: 'discover', id: 'wellbeing' }); state.props.onSceneEvent({ type: 'arrive', id: 'wellbeing' }); });
    expect(state.props.controller.current.target.z).toBeGreaterThan(0);
    act(() => { state.props.onSceneEvent({ type: 'discover', id: 'life' }); state.props.onSceneEvent({ type: 'arrive', id: 'life' }); });
    expect(screen.getByLabelText('3 of 3 tour places discovered')).toBeVisible();
    expect(screen.getByText('Your little world is awake.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start guided journey' })).toBeVisible();
  });
  it('cancels a guided route when the visitor chooses their own destination', () => {
    show(); act(() => { state.props.onStatusChange('ready'); state.props.onActiveChange(true); });
    fireEvent.click(screen.getByRole('button', { name: 'Start guided journey' }));
    fireEvent.click(screen.getByRole('button', { name: 'Map destination Life' }));
    const target = state.props.controller.current.target;
    act(() => state.props.onSceneEvent({ type: 'arrive', id: 'work' }));
    expect(state.props.controller.current.target).toEqual(target);
    expect(screen.getByLabelText('0 of 3 tour places discovered')).toBeVisible();
  });
  it('starts the guided route at the chosen district and wraps through the other places', () => {
    show(); act(() => { state.props.onStatusChange('ready'); state.props.onActiveChange(true); });
    fireEvent.click(screen.getByRole('button', { name: 'Map destination Wellbeing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start guided journey' }));
    expect(state.props.controller.current.target.x).toBeGreaterThan(0);
    act(() => state.props.onSceneEvent({ type: 'arrive', id: 'wellbeing' }));
    expect(state.props.controller.current.target.z).toBeGreaterThan(0);
    act(() => state.props.onSceneEvent({ type: 'arrive', id: 'life' }));
    expect(state.props.controller.current.target.x).toBeLessThan(0);
    expect(screen.getByLabelText('0 of 3 tour places discovered')).toBeVisible();
  });
  it('keeps a chosen destination through a scroll pause, but releases it on arrival', () => {
    show(); act(() => { state.props.onStatusChange('ready'); state.props.onActiveChange(true); });
    fireEvent.click(screen.getByRole('button', { name: 'Map destination Wellbeing' }));
    const target = state.props.controller.current.target;
    act(() => { state.props.onActiveChange(false); state.props.controller.current.target = null; state.props.onActiveChange(true); });
    expect(state.props.controller.current.target).toEqual(target);
    act(() => { state.props.controller.current.target = null; state.props.onSceneEvent({ type: 'arrive', id: 'wellbeing' }); state.props.onActiveChange(false); state.props.onActiveChange(true); });
    expect(state.props.controller.current.target).toBeNull();
  });
});
