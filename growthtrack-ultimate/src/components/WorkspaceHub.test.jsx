import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { localDateKey } from '../lib/metricSeries';

const mocks = vi.hoisted(() => ({ state: {} }));
vi.mock('../store/useStore', () => ({ default: selector => selector(mocks.state) }));
vi.mock('../hooks/usePlayfulMotion', () => ({ default: () => ({ canAnimate: false }) }));
import WorkspaceHub from './WorkspaceHub';

beforeEach(() => { mocks.state = { user: { dateFormat: 'YYYY-MM-DD', tasks: { pending: [], completed: [] }, manualProjects: [] }, notes: [] }; });
afterEach(cleanup);
const show = () => render(<MemoryRouter><WorkspaceHub /></MemoryRouter>);

it('prioritizes the real earliest task, keeps the queue bounded and exposes its stored due date', () => {
  const today = localDateKey(new Date());
  const tasks = [
    { id: 'today', title: 'Due today', dueDate: today },
    { id: 'old', title: 'Earliest task', due_date: '2001-01-01' },
    { id: 'later', title: 'Later task', dueDate: '2099-01-01' },
    { id: 'undated', title: 'Undated task' },
    { id: 'done', title: 'Already done', completed: true, dueDate: '2000-01-01' },
  ];
  mocks.state.user.tasks = { pending: tasks };
  show();
  expect(screen.getByRole('heading', { name: 'Earliest task' })).toBeVisible();
  const queue = within(screen.getByRole('region', { name: 'Your queue' }));
  expect(queue.getAllByRole('listitem')).toHaveLength(3);
  expect(queue.getByText('2001-01-01')).toHaveAttribute('datetime', '2001-01-01');
  expect(queue.getByText('Today')).toHaveAttribute('datetime', today);
  expect(queue.getByText('2 tasks due or overdue')).toBeVisible();
  expect(queue.getByRole('link', { name: 'View all 4 tasks' })).toHaveAttribute('href', '/workspace/tasks');
  expect(queue.queryByText('Already done')).toBeNull();
  expect(tasks.map(task => task.id)).toEqual(['today', 'old', 'later', 'undated', 'done']);
});

it('orders only dated activity and keeps all tool destinations in their existing domains', () => {
  mocks.state.user.tasks = [{ id: 'done', title: 'First task', status: 'completed', completedAt: '2026-01-01T12:00:00Z' }, { id: 'no-date', title: 'Undated completion', done: true }];
  mocks.state.notes = [{ id: 'note', title: 'A saved idea', updated_at: '2026-02-01T12:00:00Z' }, { id: 'undated', title: 'Undated note' }];
  show();
  const activity = within(screen.getByRole('region', { name: 'Recent activity' }));
  expect(activity.getAllByRole('link').map(link => link.textContent)).toEqual(['Edited A saved idea', 'Completed First task']);
  expect(activity.getByText('2026-02-01')).toHaveAttribute('datetime', '2026-02-01T12:00:00Z');
  expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/workspace/calendar?view=agenda');
  expect(screen.getByRole('link', { name: 'My Files' })).toHaveAttribute('href', '/workspace/files');
  expect(screen.getByRole('link', { name: 'Timesheet' })).toHaveAttribute('href', '/workspace/timesheet?view=timer');
  expect(screen.getByRole('link', { name: 'Goals' })).toHaveAttribute('href', '/workspace/goals');
});

it('uses active saved projects for the fallback focus and retains honest empty states', () => {
  mocks.state.user.manualProjects = [{ id: 'archived', title: 'Old project', status: 'Archived' }, { id: 'active', title: 'Current project', status: 'Active' }];
  show();
  expect(screen.getByRole('heading', { name: 'Current project' })).toBeVisible();
  const board = within(screen.getByRole('region', { name: 'Project board' }));
  expect(board.getAllByRole('listitem').map(item => item.textContent)).toEqual(['Current projectActive', 'Old projectArchived']);
  expect(screen.getByText('No tasks due or overdue today')).toBeVisible();
  expect(screen.getByText('No dated task completions or note edits yet.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAccessibleDescription('2 Saved projects');
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/workspace/projects?view=mine');
  expect(screen.getByRole('link', { name: 'Open projects' })).toHaveAttribute('href', '/workspace/projects?view=mine');
  expect(board.getAllByRole('link').every(link => link.getAttribute('href') === '/workspace/projects?view=mine')).toBe(true);
});

it('routes project setup to My Projects when no saved projects exist', () => {
  show();
  expect(screen.getByRole('link', { name: 'Start in Projects' })).toHaveAttribute('href', '/workspace/projects?view=mine');
});
