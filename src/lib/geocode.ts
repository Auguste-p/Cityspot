import { FALLBACK_CITY, GEO_API_COMMUNES_URL, PHOTON_SEARCH_URL } from '../constants/map';

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  city?: string;
  /** Code INSEE de la commune (renseigné par la recherche de commune, pas par Photon). */
  insee?: string;
}

interface PhotonProperties {
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  osm_value?: string;
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

// Photon ne renseigne `city` que sur les adresses/lieux *dans* une commune ; quand le résultat
// est la commune elle-même (ex. « Montpellier »), son nom est dans `name`. Sans ça la ville
// serait vide, et le signalement retomberait sur une ville qui n'est pas celle choisie.
function toCity(p: PhotonProperties): string | undefined {
  return p.city ?? (['city', 'town', 'village'].includes(p.osm_value ?? '') ? p.name : undefined);
}

// Le profil stocke le label complet de toCityLabel ("Montpellier, Occitanie") ;
// on n'a besoin que du nom de ville pour filtrer/comparer avec issues.city.
export function getCityName(label?: string | null): string | undefined {
  return label?.split(',')[0]?.trim() || undefined;
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
        city: toCity(feature.properties),
      }))
      .filter((result) => result.label.length > 0);
  } catch {
    return [];
  }
}

export function searchAddress(query: string): Promise<GeocodeResult[]> {
  return photonSearch(query, {}, toLabel);
}

interface GeoApiCommune {
  nom: string;
  code: string;
  centre?: { coordinates: [number, number] }; // [lon, lat]
  departement?: { nom: string };
}

export interface Commune {
  name: string;
  insee: string;
}

// API Géo : liste de communes, ou [] si l'API répond en erreur ou est injoignable.
async function geoFetch(params: Record<string, string>): Promise<GeoApiCommune[]> {
  try {
    const response = await fetch(`${GEO_API_COMMUNES_URL}?${new URLSearchParams(params)}`);
    return response.ok ? ((await response.json()) as GeoApiCommune[]) : [];
  } catch {
    return [];
  }
}

// Recherche de commune au fil de la frappe (inscription) : commune officielle, code INSEE et
// coordonnées de son centre pour centrer la carte à la connexion. Les communes les plus
// peuplées passent en premier (`boost=population`).
export async function searchCity(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const communes = await geoFetch({ nom: trimmed, fields: 'nom,code,centre,departement', boost: 'population', limit: '5' });
  return communes
    .filter((commune) => commune.centre)
    .map((commune) => ({
      label: [commune.nom, commune.departement?.nom].filter(Boolean).join(', '),
      lat: commune.centre!.coordinates[1],
      lng: commune.centre!.coordinates[0],
      insee: commune.code,
    }));
}

// Commune qui contient un point GPS : c'est elle, et non le nom de ville renvoyé par le géocodeur
// d'adresses, qui rattache un signalement à une mairie. Marche aussi pour un lieu-dit. `null` si le
// point est hors de France ou si l'API est injoignable — l'appelant continue sans code INSEE.
export async function reverseCommune(lat: number, lng: number): Promise<Commune | null> {
  const [commune] = await geoFetch({ lat: String(lat), lon: String(lng), fields: 'nom,code' });
  return commune ? { name: commune.nom, insee: commune.code } : null;
}
