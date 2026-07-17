// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  getUserProfile: vi.fn(),
  signOut: vi.fn(),
  updateUserProfile: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { getUserProfile } from '../services/authService';
import { Settings } from './Settings';

const mockedUseUser = vi.mocked(useUser);
const mockedGetUserProfile = vi.mocked(getUserProfile);

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
      phone: '0601020304',
      address: '1 rue de la Paix',
      avatar: 'J',
      emailNotifications: true,
      profileVisible: false,
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const { container } = renderSettings();
    await screen.findByText('Paramètres');
    await screen.findByDisplayValue('Jeanne Dupont');
    await expectNoA11yViolations(container);
  });
});
