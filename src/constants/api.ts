export const API = {
  OSM_TILES: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  OSM_ATTRIBUTION:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
  OSRM_BASE: 'https://router.project-osrm.org/route/v1',
  NOMINATIM_SEARCH: 'https://nominatim.openstreetmap.org/search',
  NOMINATIM_REVERSE: 'https://nominatim.openstreetmap.org/reverse',
  OVERPASS: 'https://overpass-api.de/api/interpreter',
  ELEVATION: 'https://api.open-meteo.com/v1/elevation',
} as const;

export const ATTRIBUTIONS = {
  osm: '© OpenStreetMap contributeurs',
  osrm: 'Routage par OSRM',
  nominatim: 'Géocodage par Nominatim',
  overpass: 'POI par Overpass API',
  openMeteo: 'Altitude par Open-Meteo',
};
