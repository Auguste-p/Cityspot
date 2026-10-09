// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  getUserProfile: vi.fn(),
  signOut: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteOwnAccount: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { deleteOwnAccount, getUserProfile, signOut } from '../services/authService';
import { Settings } from './Settings';

const mockedUseUser = vi.mocked(useUser);
const mockedGetUserProfile = vi.mocked(getUserProfile);
const mockedSignOut = vi.mocked(signOut);
const mockedDeleteOwnAccount = vi.mocked(deleteOwnAccount);

const CITIZEN = { id: 'u1', email: 'a@b.com', name: 'Jeanne Dupont', avatar: 'J', role: 'citizen' as const };

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Settings accessibility (RGAA / axe-core)', () => {
  it('the loading state has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedGetUserProfile.mockReturnValue(new Promise(() => {})); // never resolves: keeps profileLoading true

    const { container } = renderSettings();
    await screen.findByText('Chargement des paramètres');
    await expectNoA11yViolations(container);
  });

  it('the loaded form (personal info + preferences) has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedGetUserProfile.mockResolvedValue({
      id: CITIZEN.id,
      name: 'Jeanne Dupont',
      city: 'Lyon',
      cityLat: null,
      cityLng: null,
      city_insee: null,
      role: 'citizen',
      phone: '0601020304',
      address: '1 rue de la Paix',
      avatar: 'J',
      emailNotifications: true,
      profileVisible: false,
      created_at: '2026-01-01T00:00:00.000Z',
      deleted_at: null,
    });

    const { container } = renderSettings();
    await screen.findByText('Paramètres');
    await screen.findByDisplayValue('Jeanne Dupont');
    await expectNoA11yViolations(container);

    // Les liens légaux ne vivent que sur /login et ici, pas dans le Layout.
    const legal = screen.getByRole('navigation', { name: 'Informations légales' });
    expect(Array.from(legal.querySelectorAll('a')).map((link) => link.getAttribute('href'))).toEqual([
      '/mentions-legales',
      '/cgu',
      '/confidentialite',
      '/accessibilite',
    ]);
  });

  it('the "danger zone" delete-account section has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedGetUserProfile.mockResolvedValue({
      id: CITIZEN.id,
      name: 'Jeanne Dupont',
      city: 'Lyon',
      cityLat: null,
      cityLng: null,
      city_insee: null,
      role: 'citizen',
      phone: '0601020304',
      address: '1 rue de la Paix',
      avatar: 'J',
      emailNotifications: true,
      profileVisible: false,
      created_at: '2026-01-01T00:00:00.000Z',
      deleted_at: null,
    });

    const { container } = renderSettings();
    await screen.findByText('Supprimer mon compte');
    await expectNoA11yViolations(container);
  });
});

describe('Settings account deletion', () => {
  const profile = {
    id: CITIZEN.id,
    name: 'Jeanne Dupont',
    city: 'Lyon',
    cityLat: null,
    cityLng: null,
    city_insee: null,
    role: 'citizen' as const,
    phone: '0601020304',
    address: '1 rue de la Paix',
    avatar: 'J',
    emailNotifications: true,
    profileVisible: false,
    created_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('confirming calls deleteOwnAccount, then signOut, then redirects to /login', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedGetUserProfile.mockResolvedValue(profile);
    mockedDeleteOwnAccount.mockResolvedValue(undefined);
    mockedSignOut.mockResolvedValue(undefined);

    renderSettings();
    await screen.findByText('Supprimer mon compte');
    fireEvent.click(screen.getByText('Supprimer mon compte'));

    await waitFor(() => expect(mockedDeleteOwnAccount).toHaveBeenCalled());
    await waitFor(() => expect(mockedSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }));
  });

  it('cancelling the confirm dialog does not call deleteOwnAccount', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedGetUserProfile.mockResolvedValue(profile);

    renderSettings();
    await screen.findByText('Supprimer mon compte');
    fireEvent.click(screen.getByText('Supprimer mon compte'));

    expect(mockedDeleteOwnAccount).not.toHaveBeenCalled();
  });
});
