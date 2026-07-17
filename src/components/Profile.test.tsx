// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import type { Post } from '../types/Post';

vi.mock('../hooks/useIssues', () => ({
  useIssues: vi.fn(),
}));

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  getUserProfile: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { useIssues } from '../hooks/useIssues';
import { getUserProfile } from '../services/authService';
import { Profile } from './Profile';

const mockedUseUser = vi.mocked(useUser);
const mockedUseIssues = vi.mocked(useIssues);
const mockedGetUserProfile = vi.mocked(getUserProfile);

const CITIZEN = { id: 'u1', email: 'a@b.com', name: 'Jeanne Dupont', avatar: 'J', role: 'citizen' as const };

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    title: 'Nid de poule rue Victor Hugo',
    description: 'Un trou dangereux',
    location: { lat: 45.75, lng: 4.85, address: 'Rue Victor Hugo' },
    imageUrl: 'https://picsum.photos/200',
    tasks: [],
    materials: [],
    isPrivateProperty: false,
    votes: { positive: 3, negative: 1 },
    createdAt: new Date('2026-01-01'),
    status: 'pending',
    created_by: CITIZEN.id,
    ...overrides,
  };
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Profile accessibility (RGAA / axe-core)', () => {
  it('the loading state has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [], loading: true, error: null, reload: vi.fn() });
    mockedGetUserProfile.mockResolvedValue(null);

    const { container } = renderProfile();
    await screen.findByText('Chargement du profil');
    await expectNoA11yViolations(container);
  });

  it('the error state has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [], loading: false, error: new Error('Panne réseau'), reload: vi.fn() });
    mockedGetUserProfile.mockResolvedValue(null);

    const { container } = renderProfile();
    await screen.findByText('Impossible de charger le profil');
    await expectNoA11yViolations(container);
  });

  it('a citizen profile with signalements has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({
      issues: [post({ id: 'p1', title: 'Nid de poule rue Victor Hugo' }), post({ id: 'p2', title: 'Lampadaire cassé', status: 'completed' })],
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    mockedGetUserProfile.mockResolvedValue({
      id: CITIZEN.id,
      name: 'Jeanne Dupont',
      city: 'Lyon',
      phone: null,
      address: null,
      avatar: null,
      emailNotifications: true,
      profileVisible: false,
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const { container } = renderProfile();
    await screen.findByText('Lampadaire cassé');
    await expectNoA11yViolations(container);
  });

  it('a municipal ("Mairie" badge) empty profile has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: true, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [], loading: false, error: null, reload: vi.fn() });
    mockedGetUserProfile.mockResolvedValue({
      id: CITIZEN.id,
      name: 'Jeanne Dupont',
      city: 'Lyon',
      phone: null,
      address: null,
      avatar: null,
      emailNotifications: true,
      profileVisible: false,
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const { container } = renderProfile();
    await screen.findByText('Mairie');
    await expectNoA11yViolations(container);
  });
});
