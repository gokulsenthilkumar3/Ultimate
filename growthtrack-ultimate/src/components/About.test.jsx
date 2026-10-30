import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useStore from '../store/useStore';

vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn(() => Promise.resolve({ status: 'ok' })) }));
vi.mock('../hooks/useGeolocation', () => ({ fetchIpInfo: vi.fn(() => Promise.resolve(null)), default: vi.fn() }));

import About from './About';

const commit = (sha, message) => ({ sha: sha.padEnd(40, '0'), html_url: `https://example.test/${sha}`, commit: { message, author: { date: '2026-10-29T10:00:00Z' } } });

beforeEach(() => {
  useStore.setState({ user: { id: 'owner', name: 'Test owner' } });
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([
    commit('aaaaaaa', 'feat: add the thing\nFirst detail\nSecond detail'),
    commit('bbbbbbb', 'fix: repair the other thing'),
  ]) })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('About', () => {
  it('keeps its status cards and release history, with real headings and no emoji', async () => {
    const view = render(<About />);
    expect(await screen.findByText('feat: add the thing')).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: /Under the Hood/ })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: /Release History/ })).toBeVisible();
    expect(screen.getByText('Welcome back, Test owner.')).toBeVisible();
    expect(view.container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(view.container.querySelector('[style*="backdrop"]')).toBeNull();
  });

  it('does not nest the commit link inside the toggle button, and wires aria-expanded', async () => {
    const view = render(<About />);
    const toggle = await screen.findByRole('button', { name: /feat: add the thing/ });
    expect(view.container.querySelectorAll('button a')).toHaveLength(0);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('First detail')).toBeVisible();
    expect(toggle.getAttribute('aria-controls')).toBe(screen.getByText('First detail').closest('ul').id);
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('First detail')).toBeNull();
    const second = screen.getByRole('button', { name: /fix: repair the other thing/ });
    expect(second).toHaveAttribute('aria-expanded', 'false');
    expect(within(second.closest('.about-entry')).getByRole('link', { name: '#bbbbbbb' })).toHaveAttribute('href', 'https://example.test/bbbbbbb');
  });
});
