import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: {},
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('../store/useStore', () => ({ default: selector => selector(mocks.state) }));
vi.mock('../hooks/useToast', () => ({ useToast: () => mocks.toast }));
import Projects from './Projects';

beforeEach(() => {
  mocks.state = {
    user: { manualProjects: [{ id: 'saved', title: 'Saved workspace project', status: 'Active' }] },
    updateUserSlice: vi.fn(),
  };
});
afterEach(cleanup);

function NavigationState() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="project-location">{location.search}</output><button onClick={() => navigate(-1)}>Back</button><button onClick={() => navigate(1)}>Forward</button></>;
}
const show = path => render(<MemoryRouter initialEntries={[path]}><Projects /><NavigationState /></MemoryRouter>);
const query = () => new URLSearchParams(screen.getByTestId('project-location').textContent);

describe('Projects route-owned source and layout selection', () => {
  it('opens the saved projects tab from a workspace deep link', () => {
    show('/workspace/projects?view=mine&from=workspace');
    expect(screen.getByRole('tab', { name: 'My Projects (1)' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel')).getByRole('heading', { name: 'Saved workspace project' })).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Search repositories' })).toBeNull();
    expect(query().get('from')).toBe('workspace');
  });

  it.each(['grid', 'list'])('honors the existing repository %s deep link', layout => {
    show('/workspace/projects?view=' + layout);
    expect(screen.getByRole('tab', { name: 'Repositories (0)' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('group', { name: 'Repository layout' })).getByRole('button', { name: layout === 'grid' ? 'Grid' : 'List' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps tabs and layout synchronized through navigation while preserving other query parameters', () => {
    show('/workspace/projects?view=list&from=workspace&filter=active');
    fireEvent.click(screen.getByRole('tab', { name: 'My Projects (1)' }));
    expect(query().get('view')).toBe('mine');
    expect(within(screen.getByRole('group', { name: 'Project layout' })).getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Saved workspace project' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Kanban' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(query().get('view')).toBe('list');
    expect(screen.getByRole('tab', { name: 'Repositories (0)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.getByRole('tab', { name: 'My Projects (1)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Kanban' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Edit Saved workspace project' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Repositories (0)' }));
    expect(query().get('view')).toBe('github');
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(query().get('view')).toBe('list');
    expect(query().get('from')).toBe('workspace');
    expect(query().get('filter')).toBe('active');
    expect(mocks.state.updateUserSlice).not.toHaveBeenCalled();
  });
});
