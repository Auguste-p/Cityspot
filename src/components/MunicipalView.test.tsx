// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import type { Post } from '../types/Post';

vi.mock('../hooks/useIssues', () => ({
  useIssues: vi.fn(),
}));

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { useIssues } from '../hooks/useIssues';
import { MunicipalView } from './MunicipalView';

const mockedUseIssues = vi.mocked(useIssues);
const mockedUseUser = vi.mocked(useUser);

const MUNICIPAL_AGENT = {
  id: 'agent-1',
  email: 'agent@ville.fr',
  name: 'Agent Municipal',
  role: 'municipal' as const,
  city: 'Montpellier, Occitanie',
};

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
    category: 'voirie',
    ...overrides,
  };
}

function renderMunicipalView() {
  return render(
    <MemoryRouter>
      <MunicipalView />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('MunicipalView accessibility (RGAA / axe-core)', () => {
  beforeEach(() => {
    mockedUseUser.mockReturnValue({
      user: MUNICIPAL_AGENT,
      loading: false,
      isMunicipalUser: true,
      refreshUser: vi.fn(),
    });
  });

  it('the loading state has no violation', async () => {
    mockedUseIssues.mockReturnValue({ issues: [], loading: true, error: null, reload: vi.fn() });
    const { container } = renderMunicipalView();
    await screen.findByText('Chargement des projets');
    await expectNoA11yViolations(container);
  });

  it('the error state has no violation', async () => {
    mockedUseIssues.mockReturnValue({ issues: [], loading: false, error: new Error('Panne réseau'), reload: vi.fn() });
    const { container } = renderMunicipalView();
    await screen.findByText('Impossible de charger les projets');
    await expectNoA11yViolations(container);
  });

  it('the empty state (category filters, no posts) has no violation', async () => {
    mockedUseIssues.mockReturnValue({ issues: [], loading: false, error: null, reload: vi.fn() });
    const { container } = renderMunicipalView();
    await screen.findByText('Filtrer par catégorie');
    await expectNoA11yViolations(container);
  });

  it('the list of posts across categories has no violation', async () => {
    mockedUseIssues.mockReturnValue({
      issues: [
        post({ id: 'p1', title: 'Nid de poule rue Victor Hugo', category: 'voirie', status: 'pending' }),
        post({ id: 'p2', title: 'Lampadaire cassé', category: 'eclairage', status: 'in-progress', isMunicipalProject: true }),
        post({ id: 'p3', title: 'Trottoir refait', category: 'securite', status: 'completed' }),
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const { container } = renderMunicipalView();
    await screen.findByText('Trottoir refait');
    await expectNoA11yViolations(container);
  });
});
