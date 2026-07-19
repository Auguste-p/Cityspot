import type { StyleSpecification } from 'maplibre-gl';

export const NOMINATIM_REVERSE_GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse';
// Photon (basé sur les mêmes données OSM que Nominatim, mais pensé pour la
// recherche au fil de la frappe : rues, numéros, lieux nommés — pas
// uniquement des villes) : https://photon.komoot.io/
export const PHOTON_SEARCH_URL = 'https://photon.komoot.io/api/';

export const FALLBACK_CITY = {
  name: 'Paris',
  lat: 48.8566,
  lng: 2.3522,
  zoom: 12,
} as const;

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};
