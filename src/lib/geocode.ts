import { FALLBACK_CITY, PHOTON_SEARCH_URL } from '../constants/map';

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

interface PhotonProperties {
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface PhotonFeature {
  properties: PhotonProperties;
  geometry: { coordinates: [number, number] }; // [lon, lat]
}

function toLabel(p: PhotonProperties): string {
  const parts: string[] = [];

  if (p.name) {
    parts.push(p.name);
  }

  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ');
  if (streetLine && streetLine !== p.name) {
    parts.push(streetLine);
  }

  if (p.city) {
    parts.push(p.postcode ? `${p.postcode} ${p.city}` : p.city);
  } else if (p.county) {
    parts.push(p.county);
  }

  if (p.country && p.country !== 'France') {
    parts.push(p.country);
  }

  return parts.join(', ');
}

function toCityLabel(p: PhotonProperties): string {
  return [p.name, p.state].filter(Boolean).join(', ');
}

// ponytail: appel direct depuis le navigateur (pas de proxy serveur), cohérent
// avec le reverse-geocoding déjà fait ainsi dans MapView. Débit largement sous
// la limite d'usage raisonnable de l'instance publique vu le debounce appliqué.
async function photonSearch(
  query: string,
  extraParams: Record<string, string | string[]>,
  toResultLabel: (p: PhotonProperties) => string,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmed,
    limit: '5',
    lang: 'fr',
    // Priorise (sans l'imposer) les résultats proches de la France plutôt
    // que des homonymes à l'étranger sur une requête ambiguë.
    lat: String(FALLBACK_CITY.lat),
    lon: String(FALLBACK_CITY.lng),
  });
  for (const [key, value] of Object.entries(extraParams)) {
    for (const v of Array.isArray(value) ? value : [value]) {
      params.append(key, v);
    }
  }

  try {
    const response = await fetch(`${PHOTON_SEARCH_URL}?${params}`);
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { features: PhotonFeature[] };

    return data.features
      .map((feature) => ({
        label: toResultLabel(feature.properties),
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      }))
      .filter((result) => result.label.length > 0);
  } catch {
    return [];
  }
}

export function searchAddress(query: string): Promise<GeocodeResult[]> {
  return photonSearch(query, {}, toLabel);
}

// Réservé aux villes/communes (pas de rue ni de lieu-dit) — utilisé à
// l'inscription pour garantir une ville reconnue par OpenStreetMap, avec des
// coordonnées fiables pour centrer la carte à la connexion.
export function searchCity(query: string): Promise<GeocodeResult[]> {
  return photonSearch(query, { osm_tag: ['place:city', 'place:town', 'place:village'] }, toCityLabel);
}
