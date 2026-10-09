import { afterEach, describe, expect, it, vi } from 'vitest';
import { reverseCommune, searchAddress, searchCity } from './geocode';

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
      { label: 'Tour Eiffel, 5 Avenue Anatole France, 75007 Paris', lat: 48.8582599, lng: 2.2945006, city: 'Paris' },
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

    expect(results).toEqual([{ label: 'Rue de la République, 69001 Lyon', lat: 45.7675252, lng: 4.836052, city: 'Lyon' }]);
  });

  it('takes the city from the name when the result is itself a city (Photon sets no `city` on it)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        photonResponse([
          {
            properties: { name: 'Montpellier', osm_key: 'place', osm_value: 'city', country: 'France' },
            geometry: { coordinates: [3.8767337, 43.6112422] },
          },
        ]),
      ),
    );

    const results = await searchAddress('Montpellier');

    expect(results[0].city).toBe('Montpellier');
  });

  it('leaves the city undefined when the result has none and is not a city (never guess)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        photonResponse([
          {
            properties: { name: 'Lieu-dit Les Bruyères', osm_key: 'place', osm_value: 'locality', country: 'France' },
            geometry: { coordinates: [3.1, 43.2] },
          },
        ]),
      ),
    );

    const results = await searchAddress('Les Bruyères');

    expect(results[0].city).toBeUndefined();
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

describe('searchCity (API Géo)', () => {
  const lyon = {
    nom: 'Lyon',
    code: '69123',
    centre: { type: 'Point', coordinates: [4.8320114, 45.7578137] },
    departement: { code: '69', nom: 'Rhône' },
  };

  it('does not call the API for a query shorter than 2 characters', async () => {
    vi.stubGlobal('fetch', vi.fn());

    await expect(searchCity('L')).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('queries communes by name, most populated first', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    await searchCity('Lyon');

    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.origin + calledUrl.pathname).toBe('https://geo.api.gouv.fr/communes');
    expect(calledUrl.searchParams.get('nom')).toBe('Lyon');
    expect(calledUrl.searchParams.get('boost')).toBe('population');
  });

  it('returns a "name, département" label with the INSEE code and the commune centre', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [lyon] }));

    await expect(searchCity('Lyon')).resolves.toEqual([
      { label: 'Lyon, Rhône', lat: 45.7578137, lng: 4.8320114, insee: '69123' },
    ]);
  });

  it('resolves an empty array on an HTTP or network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(searchCity('Lyon')).resolves.toEqual([]);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(searchCity('Lyon')).resolves.toEqual([]);
  });
});

describe('reverseCommune', () => {
  it('returns the commune (name and INSEE code) that contains the point', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ nom: 'Castelnau-le-Lez', code: '34057' }] });
    vi.stubGlobal('fetch', fetchMock);

    await expect(reverseCommune(43.63, 3.91)).resolves.toEqual({ name: 'Castelnau-le-Lez', insee: '34057' });

    const calledUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(calledUrl.searchParams.get('lat')).toBe('43.63');
    expect(calledUrl.searchParams.get('lon')).toBe('3.91');
  });

  it('returns null outside France, on an HTTP error and on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    await expect(reverseCommune(51.5, -0.12)).resolves.toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(reverseCommune(43.63, 3.91)).resolves.toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(reverseCommune(43.63, 3.91)).resolves.toBeNull();
  });
});
