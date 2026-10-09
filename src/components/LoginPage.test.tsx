// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';

vi.mock('../lib/geocode', () => ({
  searchCity: vi.fn().mockResolvedValue([]),
}));

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

describe('LoginPage terms acceptance', () => {
  async function openSignup() {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await screen.findByLabelText('Email');
    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
    await screen.findByLabelText('Nom');
  }

  it('shows an unchecked, required terms checkbox linking to the CGU and the privacy policy on signup only', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await screen.findByLabelText('Email');
    expect(screen.queryByRole('checkbox')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }));
    const checkbox = (await screen.findByRole('checkbox', { name: /conditions d'utilisation/i })) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.required).toBe(true);
    expect(screen.getByRole('link', { name: /conditions d'utilisation/i }).getAttribute('href')).toBe('/cgu');
    expect(screen.getByRole('link', { name: /politique de confidentialité/i, hidden: false }).getAttribute('href')).toBe(
      '/confidentialite',
    );
  });

  it('records the accepted terms version and date with the account', async () => {
    const { signUp } = await import('../services/authService');
    vi.mocked(signUp).mockClear();
    vi.mocked(signUp).mockResolvedValueOnce({ user: { id: 'u1' } as any, session: null });
    await openSignup();

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Auguste' } });
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Lyon' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'azertyuiop' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /conditions d'utilisation/i }));
    fireEvent.click(screen.getByRole('button', { name: /créer un compte/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(vi.mocked(signUp).mock.calls[0][2]).toMatchObject({
      termsVersion: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      termsAcceptedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it('sends the INSEE code of the commune picked from the suggestions', async () => {
    const { searchCity } = await import('../lib/geocode');
    vi.mocked(searchCity).mockResolvedValueOnce([{ label: 'Lyon, Rhône', lat: 45.75, lng: 4.83, insee: '69123' }]);
    const { signUp } = await import('../services/authService');
    vi.mocked(signUp).mockClear();
    vi.mocked(signUp).mockResolvedValueOnce({ user: { id: 'u1' } as any, session: null });
    await openSignup();

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Auguste' } });
    fireEvent.change(screen.getByLabelText('Ville'), { target: { value: 'Lyon' } });
    fireEvent.mouseDown(await screen.findByRole('button', { name: /Lyon, Rhône/ }, { timeout: 2000 }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'azertyuiop' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /conditions d'utilisation/i }));
    fireEvent.click(screen.getByRole('button', { name: /créer un compte/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(vi.mocked(signUp).mock.calls[0][2]).toMatchObject({
      city: 'Lyon, Rhône', cityLat: 45.75, cityLng: 4.83, cityInsee: '69123',
    });
  });

  it('the login page shows the legal links', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await screen.findByLabelText('Email');
    const nav = screen.getByRole('navigation', { name: 'Informations légales' });
    expect(nav.querySelectorAll('a')).toHaveLength(4);
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
    fireEvent.click(screen.getByRole('checkbox', { name: /conditions d'utilisation/i }));
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
    fireEvent.click(screen.getByRole('checkbox', { name: /conditions d'utilisation/i }));
    fireEvent.click(screen.getByRole('button', { name: /créer un compte/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(screen.queryByText(/vérifiez votre boîte mail/i)).toBeNull();
  });
});
