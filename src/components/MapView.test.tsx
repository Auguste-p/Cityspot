// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import type { Post } from '../types/Post';

// maplibre-gl needs a real WebGL canvas, unavailable under jsdom — stub the
// pieces MapView actually calls (addControl/flyTo/getZoom/remove/once/resize
// on the map, setLngLat/addTo/remove chaining on markers).
vi.mock('maplibre-gl', () => {
  class FakeMap {
    addControl() {}
    flyTo() {}
    getZoom() {
      return 12;
    }
    once(_event: string, callback: () => void) {
      callback();
    }
    resize() {}
    remove() {}
  }
  class FakeMarker {
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {}
  }
  class FakeNavigationControl {}
  return {
    default: { Map: FakeMap, Marker: FakeMarker, NavigationControl: FakeNavigationControl },
  };
});

vi.mock('../hooks/useIssues', () => ({
  useIssues: vi.fn(),
  useVotes: vi.fn(),
}));

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { useIssues, useVotes } from '../hooks/useIssues';
import { MapView } from './MapView';

const mockedUseIssues = vi.mocked(useIssues);
const mockedUseVotes = vi.mocked(useVotes);
const mockedUseUser = vi.mocked(useUser);

const CITIZEN = { id: 'u1', email: 'a@b.com', role: 'citizen' as const };

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    title: 'Nid de poule rue Victor Hugo',
    description: 'Un trou dangereux',
    location: { lat: 45.75, lng: 4.85, address: 'Rue Victor Hugo' },
    imageUrl: 'https://picsum.photos/200',
    tasks: [{ id: 't1', title: 'Reboucher', completed: false }],
    materials: [],
    isPrivateProperty: false,
    votes: { positive: 3, negative: 1 },
    createdAt: new Date('2026-01-01'),
    status: 'pending',
    ...overrides,
  };
}

function renderMapView() {
  return render(
    <MemoryRouter>
      <MapView />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('MapView accessibility (RGAA / axe-core)', () => {
  it('the loading state has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [], loading: true, error: null, reload: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    const { container } = renderMapView();
    await screen.findByText('Chargement des signalements');
    await expectNoA11yViolations(container);
  });

  it('the error state has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [], loading: false, error: new Error('Panne réseau'), reload: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    const { container } = renderMapView();
    await screen.findByText('Impossible de charger la carte');
    await expectNoA11yViolations(container);
  });

  it('the default view (map + post list, no selection) has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [post()], loading: false, error: null, reload: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    const { container } = renderMapView();
    await screen.findByText('Tous les signalements');
    await expectNoA11yViolations(container);
  });

  it('the selected-post detail panel (municipal, private, in-progress) has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({
      issues: [post({ status: 'in-progress', isMunicipalProject: true, isPrivateProperty: true })],
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    const { container } = renderMapView();
    const listItem = await screen.findByText('Tous les signalements');
    fireEvent.click(screen.getByText('Rue Victor Hugo'));
    await screen.findByText('Voir les détails');

    await expectNoA11yViolations(container);
    expect(listItem).toBeTruthy();
  });
});
