// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { FALLBACK_CITY } from '../constants/map';
import type { Post } from '../types/Post';

// maplibre-gl needs a real WebGL canvas, unavailable under jsdom — stub the
// pieces MapView actually calls (addControl/flyTo/getZoom/remove/once/resize
// on the map, setLngLat/addTo/remove chaining on markers).
vi.mock('maplibre-gl', () => {
  class FakeMap {
    static instances: FakeMap[] = [];
    options: any;
    constructor(options: any) {
      this.options = options;
      FakeMap.instances.push(this);
    }
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

import maplibregl from 'maplibre-gl';
import { useUser } from '../context/UserContext';
import { useIssues, useVotes } from '../hooks/useIssues';
import { MapView } from './MapView';

const FakeMap = maplibregl.Map as unknown as { instances: { options: any }[] };

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
  FakeMap.instances = [];
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

describe('MapView initial centering', () => {
  it('centers on the fallback city when the user has no saved city', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [], loading: false, error: null, reload: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    renderMapView();
    await screen.findByText('Tous les signalements');

    expect(FakeMap.instances).toHaveLength(1);
    expect(FakeMap.instances[0].options.center).toEqual([FALLBACK_CITY.lng, FALLBACK_CITY.lat]);
  });

  it("centers on the user's saved city when available", async () => {
    mockedUseUser.mockReturnValue({
      user: { ...CITIZEN, cityLat: 45.75, cityLng: 4.85 },
      loading: false,
      isMunicipalUser: false,
      refreshUser: vi.fn(),
    });
    mockedUseIssues.mockReturnValue({ issues: [], loading: false, error: null, reload: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    renderMapView();
    await screen.findByText('Tous les signalements');

    expect(FakeMap.instances).toHaveLength(1);
    expect(FakeMap.instances[0].options.center).toEqual([4.85, 45.75]);
  });

  it('does not build the map until the user profile has finished loading', async () => {
    mockedUseUser.mockReturnValue({ user: null, loading: true, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssues.mockReturnValue({ issues: [], loading: false, error: null, reload: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    renderMapView();
    await screen.findByText('Tous les signalements');

    expect(FakeMap.instances).toHaveLength(0);
  });
});
