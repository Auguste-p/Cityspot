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
