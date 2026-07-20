import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchAddress, searchCity } from './geocode';

function photonResponse(features: unknown[]) {
  return { ok: true, json: async () => ({ features }) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchAddress', () => {
  it('does not call the API for a query shorter than 3 characters', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const results = await searchAddress('12');

    expect(results).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('builds a precise label for a named place (POI) distinct from its street', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        photonResponse([
          {
            properties: {
              name: 'Tour Eiffel',
              housenumber: '5',
              street: 'Avenue Anatole France',
              city: 'Paris',
              postcode: '75007',
              country: 'France',
            },
            geometry: { coordinates: [2.2945006, 48.8582599] },
          },
        ]),
      ),
    );

    const results = await searchAddress('Tour Eiffel');

    expect(results).toEqual([
      { label: 'Tour Eiffel, 5 Avenue Anatole France, 75007 Paris', lat: 48.8582599, lng: 2.2945006 },
    ]);
  });

  it('does not duplicate the street name when it matches the place name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        photonResponse([
          {
            properties: {
              name: 'Rue de la République',
              street: 'Rue de la République',
              city: 'Lyon',
              postcode: '69001',
              country: 'France',
            },
            geometry: { coordinates: [4.836052, 45.7675252] },
          },
        ]),
      ),
    );

    const results = await searchAddress('rue de la republique lyon');

    expect(results).toEqual([{ label: 'Rue de la République, 69001 Lyon', lat: 45.7675252, lng: 4.836052 }]);
  });

  it('resolves an empty array on an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(searchAddress('Lyon')).resolves.toEqual([]);
  });

  it('resolves an empty array on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(searchAddress('Lyon')).resolves.toEqual([]);
  });
});

describe('searchCity', () => {
  it('restricts the query to city/town/village place types', async () => {
    const fetchMock = vi.fn().mockResolvedValue(photonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await searchCity('Lyon');

    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.searchParams.getAll('osm_tag')).toEqual(['place:city', 'place:town', 'place:village']);
  });

  it('builds a simple "name, region" label, not a full address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        photonResponse([
          {
            properties: {
              name: 'Lyon',
              county: 'Métropole de Lyon',
              state: 'Auvergne-Rhône-Alpes',
              country: 'France',
            },
            geometry: { coordinates: [4.8320114, 45.7578137] },
          },
        ]),
      ),
    );

    const results = await searchCity('Lyon');

    expect(results).toEqual([{ label: 'Lyon, Auvergne-Rhône-Alpes', lat: 45.7578137, lng: 4.8320114 }]);
  });
});
