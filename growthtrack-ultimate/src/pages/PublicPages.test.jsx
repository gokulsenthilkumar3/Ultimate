import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import PrivacyPage from './PrivacyPage';
import TermsPage from './TermsPage';
import useStore from '../store/useStore';
import { setPlayfulMotionPaused } from '../hooks/usePlayfulMotion';

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

beforeEach(() => { signIn.mockReset(); setPlayfulMotionPaused(false); useStore.setState({ reducedMotion: false }); });

describe('public pages', () => {
  it('reacts to password focus, preserves entered fields on reveal, and keeps pause separate from sign in', async () => {
    const user = userEvent.setup();
    renderLogin({ pathname: '/finance/overview' });
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'owner@example.com');
    const password = screen.getByLabelText('Password', { exact: false, selector: 'input' });
    await user.type(password, 'fictional-password');
    expect(document.querySelectorAll('.login-crew .character-art[data-eyes-closed="true"]')).toHaveLength(3);
    expect(screen.getByText('A little privacy. We’ll look away.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('fictional-password');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(document.querySelector('.gt-public--login')).toHaveAttribute('data-playful-motion', 'false');
    expect(document.querySelectorAll('.animated-logo[data-animate="true"], .character-scene[data-animate="true"]')).toHaveLength(0);
    expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveValue('owner@example.com');
    expect(password).toHaveValue('fictional-password');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('keeps sign in available and the crew responsive when reduced motion is enabled', async () => {
    useStore.setState({ reducedMotion: true });
    signIn.mockResolvedValue({ error: null });
    renderLogin({ pathname: '/finance/overview' });
    expect(screen.getByRole('button', { name: 'Reduced motion is on' })).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Email address' }), 'owner@example.com');
    await userEvent.type(screen.getByLabelText(/Password/), 'fictional-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByTestId('destination')).toHaveTextContent('/finance/overview');
    expect(signIn).toHaveBeenCalledTimes(1);
  });

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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Less noise.More you.');
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
