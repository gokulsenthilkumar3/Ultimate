import React, { useRef } from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FEATURES } from '../../config/featureRegistry';
import Header from '../Header';
import WorkspaceSubnav from '../WorkspaceSubnav';
import WorkspaceChapter from './WorkspaceChapter';
import usePageEntrance from '../../hooks/usePageEntrance';
import { setPlayfulMotionPaused } from '../../hooks/usePlayfulMotion';
import useStore from '../../store/useStore';

beforeEach(() => { setPlayfulMotionPaused(false); useStore.setState({ reducedMotion: false }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); setPlayfulMotionPaused(false); });

describe('character workspace', () => {
  it('uses real module links with the deployment base path and saved sub-navigation order', () => {
    useStore.setState({ navigationTabOrder: { work: ['notes', 'tasks', 'calendar'] } });
    render(<MemoryRouter basename="/Ultimate" initialEntries={['/Ultimate/workspace/tasks']}><WorkspaceSubnav activeTab="tasks" /></MemoryRouter>);
    const nav = within(screen.getByRole('navigation', { name: 'Work page shortcuts' }));
    expect(nav.getAllByRole('link').slice(0, 3).map(link => link.textContent)).toEqual(['Notes', 'Tasks', 'Calendar']);
    expect(nav.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/Ultimate/workspace/notes');
    expect(nav.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');
    expect(nav.queryByRole('tablist')).toBeNull();
  });

  it('supplies a character and real breadcrumb on every registered module without record requests or writes', () => {
    const network = vi.spyOn(globalThis, 'fetch');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const view = render(<MemoryRouter><WorkspaceChapter activeTab="overview" /></MemoryRouter>);
    for (const feature of FEATURES) {
      view.rerender(<MemoryRouter><WorkspaceChapter activeTab={feature.id} /></MemoryRouter>);
      expect(within(screen.getByRole('navigation', { name: 'Page location' })).getByText(feature.label)).toHaveAttribute('aria-current', 'page');
      expect(document.querySelector('.workspace-chapter .character-art')).toBeInTheDocument();
    }
    expect(network).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });

  it('pauses the app logo and page crew together while notification and theme controls remain usable', async () => {
    const user = userEvent.setup();
    const setTheme = vi.fn(), openNotifications = vi.fn();
    render(<MemoryRouter><Header activeTab="tasks" user={{ name: 'Example' }} theme="light" setTheme={setTheme} onOpenNotifications={openNotifications} unreadCount={2} /><WorkspaceChapter activeTab="tasks" /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(document.querySelector('.animated-logo')).toHaveAttribute('data-animate', 'false');
    expect(document.querySelector('.character-scene')).toHaveAttribute('data-animate', 'false');
    await user.click(screen.getByRole('button', { name: 'Notifications, 2 unread' }));
    expect(openNotifications).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(setTheme).toHaveBeenCalledWith('dark');
    await user.click(screen.getByRole('button', { name: 'Play motion' }));
    expect(document.querySelector('.animated-logo')).toHaveAttribute('data-animate', 'true');
  });
});

function PageExample({ route }) {
  const ref = useRef(null);
  usePageEntrance(ref, route);
  return <section ref={ref}><input aria-label="Unfinished draft" defaultValue="" /></section>;
}

describe('page entrances preserve working state', () => {
  it('keeps the existing form and focus across view transitions, cancels previous motion, and honours pause', async () => {
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
    const animations = [];
    const animate = vi.fn(() => { const animation = { cancel: vi.fn() }; animations.push(animation); return animation; });
    Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
    try {
      const user = userEvent.setup();
      const view = render(<PageExample route="notes:all" />);
      const draft = screen.getByRole('textbox', { name: 'Unfinished draft' });
      await user.type(draft, 'Keep this draft');
      view.rerender(<PageExample route="notes:pinned" />);
      expect(screen.getByRole('textbox', { name: 'Unfinished draft' })).toBe(draft);
      expect(draft).toHaveValue('Keep this draft');
      expect(draft).toHaveFocus();
      expect(animations[0].cancel).toHaveBeenCalled();
      act(() => setPlayfulMotionPaused(true));
      expect(animations.at(-1).cancel).toHaveBeenCalled();
      const count = animate.mock.calls.length;
      view.rerender(<PageExample route="notes:tagged" />);
      expect(animate).toHaveBeenCalledTimes(count);
      act(() => setPlayfulMotionPaused(false));
      expect(animate).toHaveBeenCalledTimes(count + 1);
      act(() => useStore.setState({ reducedMotion: true }));
      expect(animations.at(-1).cancel).toHaveBeenCalled();
      view.rerender(<PageExample route="notes:all" />);
      expect(animate).toHaveBeenCalledTimes(count + 1);
      expect(draft).toHaveValue('Keep this draft');
      view.unmount();
    } finally {
      if (original) Object.defineProperty(Element.prototype, 'animate', original);
      else delete Element.prototype.animate;
    }
  });
});
