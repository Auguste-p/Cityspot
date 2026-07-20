// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';

vi.mock('../services/authService', () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

import LoginPage from './LoginPage';

afterEach(cleanup);

describe('LoginPage accessibility (RGAA / axe-core)', () => {
  it('the login form has no violation', async () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await screen.findByLabelText('Email');
    await expectNoA11yViolations(container);
  });

  it('the signup form (extra Nom/Ville fields) has no violation', async () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await screen.findByLabelText('Email');
    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
    await screen.findByLabelText('Nom');

    await expectNoA11yViolations(container);
  });

  it('the form with a visible server error has no violation', async () => {
    const { signIn } = await import('../services/authService');
    vi.mocked(signIn).mockRejectedValueOnce(new Error('Identifiants invalides'));

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await screen.findByLabelText('Email');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => expect(screen.getByText('Identifiants invalides')).toBeTruthy());
    await expectNoA11yViolations(container);
  });
});

describe('LoginPage signup flow', () => {
  it('shows an info message and switches back to login when signup returns no session (email confirmation required)', async () => {
    const { signUp } = await import('../services/authService');
    vi.mocked(signUp).mockResolvedValueOnce({ user: { id: 'u1' } as any, session: null });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await screen.findByLabelText('Email');
    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Auguste' } });
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Lyon' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'azertyuiop' } });
    fireEvent.click(screen.getByRole('button', { name: /créer un compte/i }));

    await screen.findByText(/vérifiez votre boîte mail/i);
    // Repasse en mode connexion : les champs Nom/Ville disparaissent.
    expect(screen.queryByLabelText('Nom')).toBeNull();
  });

  it('does not show the confirmation message when signup returns an active session', async () => {
    const { signUp } = await import('../services/authService');
    vi.mocked(signUp).mockResolvedValueOnce({ user: { id: 'u1' } as any, session: { access_token: 'tok' } as any });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await screen.findByLabelText('Email');
    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Auguste' } });
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Lyon' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'azertyuiop' } });
    fireEvent.click(screen.getByRole('button', { name: /créer un compte/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(screen.queryByText(/vérifiez votre boîte mail/i)).toBeNull();
  });
});
