import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import PrivacyPage from './PrivacyPage';
import TermsPage from './TermsPage';

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ signIn }) }));

function Destination() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="destination">{pathname + search + hash}</output>;
}

function renderLogin(from) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: { from } }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/finance/transactions" element={<Destination />} />
        <Route path="/finance/overview" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { signIn.mockReset(); });

describe('public pages', () => {
  it('restores the complete protected destination after owner sign in', async () => {
    signIn.mockResolvedValue({ error: null });
    renderLogin({ pathname: '/finance/transactions', search: '?category=Food', hash: '#record' });

    await userEvent.type(screen.getByRole('textbox', { name: 'Email address' }), 'owner@example.com');
    await userEvent.type(screen.getByLabelText(/Password/), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(signIn).toHaveBeenCalledWith('owner@example.com', 'correct-horse');
    expect(await screen.findByTestId('destination')).toHaveTextContent('/finance/transactions?category=Food#record');
  });

  it('keeps the owner on the form with an announced error and allows correction', async () => {
    signIn.mockResolvedValue({ error: Object.assign(new Error('Invalid credentials'), { name: 'ApiError' }) });
    renderLogin({ pathname: '/finance/overview' });

    await userEvent.type(screen.getByRole('textbox', { name: 'Email address' }), 'owner@example.com');
    await userEvent.type(screen.getByLabelText(/Password/), 'incorrect');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    await userEvent.type(screen.getByLabelText(/Password/), '2');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a busy state and blocks another submission while sign in is pending', async () => {
    let resolveSignIn;
    signIn.mockImplementation(() => new Promise(resolve => { resolveSignIn = resolve; }));
    renderLogin({ pathname: '/finance/overview' });

    await userEvent.type(screen.getByRole('textbox', { name: 'Email address' }), 'owner@example.com');
    await userEvent.type(screen.getByLabelText(/Password/), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeDisabled();
    expect(signIn).toHaveBeenCalledTimes(1);
    resolveSignIn({ error: null });
    expect(await screen.findByTestId('destination')).toHaveTextContent('/finance/overview');
  });

  it('provides owner-only entry and readable legal destinations', () => {
    const { rerender } = render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Make room for what matters.');
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#public-content');
    expect(document.getElementById('public-content')).toHaveAttribute('tabindex', '-1');
    expect(screen.getAllByRole('link', { name: /Owner sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    rerender(<MemoryRouter><PrivacyPage /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Privacy policy' })).toBeInTheDocument();
    rerender(<MemoryRouter><TermsPage /></MemoryRouter>);
    expect(screen.getByRole('article', { name: 'Terms of service' })).toBeInTheDocument();
  });
});
