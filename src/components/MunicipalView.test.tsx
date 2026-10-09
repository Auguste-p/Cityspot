// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import type { Post } from '../types/Post';

vi.mock('../hooks/useIssues', () => ({
  useIssues: vi.fn(),
  useRevokedCityIssues: vi.fn(),
}));

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { useIssues, useRevokedCityIssues } from '../hooks/useIssues';
import { MunicipalView } from './MunicipalView';

const mockedUseIssues = vi.mocked(useIssues);
const mockedUseUser = vi.mocked(useUser);
const mockedUseRevokedCityIssues = vi.mocked(useRevokedCityIssues);

const MUNICIPAL_AGENT = {
  id: 'agent-1',
  email: 'agent@ville.fr',
  name: 'Agent Municipal',
  role: 'municipal' as const,
  city: 'Montpellier, Occitanie',
  cityInsee: '34172',
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
    categories: ['voirie'],
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

describe('MunicipalView without a commune', () => {
  it('tells an agent with no INSEE code to contact the editor, and never lists other communes, with no violation', async () => {
    mockedUseUser.mockReturnValue({
      user: { ...MUNICIPAL_AGENT, cityInsee: undefined },
      loading: false,
      isMunicipalUser: true,
      refreshUser: vi.fn(),
    });
    mockedUseIssues.mockReturnValue({ issues: [post()], loading: false, error: null, reload: vi.fn() });
    mockedUseRevokedCityIssues.mockReturnValue({ issues: [], loading: false, error: null });

    const { container } = renderMunicipalView();

    await screen.findByText('Compte non rattaché à une commune');
    expect(screen.queryByText('Nid de poule rue Victor Hugo')).toBeNull();
    await expectNoA11yViolations(container);
  });

  it('filters the dashboard by the INSEE code of the agent', async () => {
    mockedUseUser.mockReturnValue({ user: MUNICIPAL_AGENT, loading: false, isMunicipalUser: true, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [], loading: false, error: null, reload: vi.fn() });
    mockedUseRevokedCityIssues.mockReturnValue({ issues: [], loading: false, error: null });

    renderMunicipalView();

    expect(mockedUseIssues).toHaveBeenCalledWith('34172');
    expect(mockedUseRevokedCityIssues).toHaveBeenCalledWith('34172');
  });
});

describe('MunicipalView accessibility (RGAA / axe-core)', () => {
  beforeEach(() => {
    mockedUseUser.mockReturnValue({
      user: MUNICIPAL_AGENT,
      loading: false,
      isMunicipalUser: true,
      refreshUser: vi.fn(),
    });
    mockedUseRevokedCityIssues.mockReturnValue({ issues: [], loading: false, error: null });
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
        post({ id: 'p1', title: 'Nid de poule rue Victor Hugo', categories: ['voirie'], status: 'pending' }),
        post({ id: 'p2', title: 'Lampadaire cassé', categories: ['eclairage'], status: 'in-progress', isMunicipalProject: true }),
        post({ id: 'p3', title: 'Trottoir refait', categories: ['securite'], status: 'completed' }),
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

describe('MunicipalView — revoked tab', () => {
  beforeEach(() => {
    mockedUseUser.mockReturnValue({ user: MUNICIPAL_AGENT, loading: false, isMunicipalUser: true, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [post({ id: 'p1', title: 'Trottoir refait' })], loading: false, error: null, reload: vi.fn() });
  });

  const revoked = (id: string, title: string, categories: Post['categories']) =>
    post({ id, title, categories, revoked: { at: new Date('2026-10-07T10:00:00Z'), reason: `Motif de ${title}` } });

  it('lists the revoked signalements with their date and reason, not in the other tabs, with no violation', async () => {
    mockedUseRevokedCityIssues.mockReturnValue({
      issues: [revoked('r1', 'Dépôt sauvage', ['proprete'])],
      loading: false,
      error: null,
    });

    const { container } = renderMunicipalView();
    await screen.findByText('Trottoir refait');
    expect(screen.getByRole('tab', { name: 'Tous (1)' })).toBeTruthy();
    expect(screen.queryByText('Dépôt sauvage')).toBeNull();

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Révoqués (1)' }));
    expect(await screen.findByText('Dépôt sauvage')).toBeTruthy();
    expect(screen.getByText(/Motif de Dépôt sauvage/)).toBeTruthy();
    expect(screen.getByText(/Révoqué le 7 octobre 2026/)).toBeTruthy();
    await expectNoA11yViolations(container);
  });

  it('follows the category filter', async () => {
    mockedUseRevokedCityIssues.mockReturnValue({
      issues: [revoked('r1', 'Dépôt sauvage', ['proprete']), revoked('r2', 'Nid de poule', ['voirie'])],
      loading: false,
      error: null,
    });

    renderMunicipalView();
    await screen.findByText('Trottoir refait');
    // « Voirie » apparaît aussi sur les cartes : on cible la tuile de filtre (le texte dans un <div>).
    fireEvent.click(screen.getAllByText('Voirie').find((el) => el.tagName === 'DIV')!);

    expect(screen.getByRole('tab', { name: 'Révoqués (1)' })).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Révoqués (1)' }));
    expect(await screen.findByText('Nid de poule')).toBeTruthy();
    expect(screen.queryByText('Dépôt sauvage')).toBeNull();
  });

  it('keeps the dashboard usable and says so when the revoked list cannot be loaded', async () => {
    mockedUseRevokedCityIssues.mockReturnValue({ issues: [], loading: false, error: new Error('Panne réseau') });

    renderMunicipalView();
    await screen.findByText('Trottoir refait');
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Révoqués (0)' }));
    expect(await screen.findByText(/Impossible de charger les signalements révoqués/)).toBeTruthy();
  });
});

