import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { localDateKey } from '../lib/metricSeries';
import useStore from '../store/useStore';
import Overview from './Overview';
import WellnessCommand from './WellnessCommand';
import WorkspaceHub from './WorkspaceHub';
import LifeCommand from './LifeCommand';
import HubCommand from './HubCommand';

const show = component => render(<MemoryRouter>{component}</MemoryRouter>);

beforeEach(() => {
  useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'owner', dateFormat: 'YYYY-MM-DD', tasks: { pending: [], completed: [] } } });
});
afterEach(cleanup);

describe('editorial overviews', () => {
  it('uses canonical tasks for the insight action and omits invented scores', () => {
    const today = localDateKey(new Date());
    useStore.setState({
      user: { id: 'owner', dateFormat: 'YYYY-MM-DD', tasks: { pending: [{ id: 'due', title: 'Submit report', dueDate: today }], completed: [] } },
      habits: [{ id: 'habit' }], goals: [{ id: 'goal', status: 'active' }],
    });
    show(<Overview />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your day, in focus' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Submit report' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Open tasks/ })).toHaveAttribute('href', '/workspace/tasks');
    expect(within(screen.getByText('Open tasks', { selector: 'dt' }).parentElement).getByText('1')).toBeVisible();
    expect(screen.queryByText(/digital twin score|health score/i)).toBeNull();
  });

  it('counts manual projects and notes from their owning collections', () => {
    useStore.setState({
      user: { id: 'owner', dateFormat: 'YYYY-MM-DD', tasks: { pending: [], completed: [] }, manualProjects: [{ id: 'project', title: 'Studio', status: 'Active' }] },
      notes: [{ id: 'note', title: 'Sketches', updatedAt: '2026-09-22T10:00:00Z' }],
    });
    show(<WorkspaceHub />);
    expect(screen.getByRole('heading', { name: 'Studio' })).toBeVisible();
    expect(within(screen.getByText('Saved projects').parentElement).getByText('1')).toBeVisible();
    expect(within(screen.getByText('Saved notes').parentElement).getByText('1')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Edited Sketches' })).toHaveAttribute('href', '/workspace/notes');
  });

  it('keeps dropped and completed media out of the life queue', () => {
    useStore.setState({
      entertainment: { media: [
        { id: 'watch', title: 'Planet Earth', status: 'Watching', updatedAt: '2026-09-22T10:00:00Z' },
        { id: 'drop', title: 'Old title', status: 'Dropped' },
        { id: 'done', title: 'Finished title', status: 'Completed' },
      ] },
      socialProfiles: [{ id: 'profile', provider: 'Example' }],
    });
    show(<LifeCommand />);
    expect(screen.getByRole('heading', { name: 'Planet Earth' })).toBeVisible();
    expect(within(screen.getByText('In your queue', { selector: 'dt' }).parentElement).getByText('1')).toBeVisible();
    expect(within(screen.getByText('Saved titles').parentElement).getByText('3')).toBeVisible();
    expect(within(screen.getByText('Saved profile links').parentElement).getByText('1')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Saved places' })).toHaveAttribute('href', '/life/places?view=list');
  });

  it('does not report zero reminders before the feed loads', () => {
    useStore.setState({ serverStatus: 'online' });
    const view = show(<HubCommand notificationState={{ enabled: true, hasLoaded: false, loading: true, unreadCount: 0 }} />);
    expect(screen.getByText('Loading reminders…')).toBeVisible();
    expect(within(screen.getByText('Unread reminders').parentElement).getByText('—')).toBeVisible();
    view.rerender(<MemoryRouter><HubCommand notificationState={{ enabled: true, hasLoaded: true, unreadCount: 1, notifications: [
      { id: 'reminder', title: 'Submit report', dueDate: '2026-09-30', href: '/workspace/tasks', read: false },
    ] }} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '1 unread reminder' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Submit report' })).toHaveAttribute('href', '/workspace/tasks');
  });

  it('shows the inline wellness check-in only while available and delegates both actions', () => {
    const open = vi.fn();
    const dismiss = vi.fn();
    const view = show(<WellnessCommand checkInAvailable onOpenCheckIn={open} onDismissCheckIn={dismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /Open daily check-in/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Not today' }));
    expect(open).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
    view.rerender(<MemoryRouter><WellnessCommand checkInAvailable={false} onOpenCheckIn={open} onDismissCheckIn={dismiss} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /Open daily check-in/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Not today' })).toBeNull();
  });
});
