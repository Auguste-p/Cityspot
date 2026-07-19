import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchAddress } from './geocode';

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
