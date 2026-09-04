import type { GeneratorParams, AppPreferences } from '../types';

export const DEFAULT_CENTER = { lat: 46.603354, lng: 1.888334 }; // Centre France
export const DEFAULT_ZOOM = 6;

export const DEFAULT_GENERATOR_PARAMS: GeneratorParams = {
  sport: 'velo',
  subtype: 'route',
  start: null,
  startLabel: '',
  routeType: 'boucle',
  distanceKm: 20,
  durationMinutes: null,
  directionDeg: 45,
  directionLabel: 'NE',
  loops: 1,
  difficulty: 'intermediaire',
  maxElevation: null,
  maxDistanceKm: 50,
  terrainPrefs: {
    pisteCyclable: false,
    sentiers: false,
    eviterGrandesRoutes: true,
    eviterChemins: false,
  },
  poiPrefs: {
    include: true,
    types: ['drinking_water', 'bench'],
  },
  manualMode: false,
  waypoints: [],
  seed: Date.now(),
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'system',
  lastStart: null,
  lastStartLabel: '',
  favoriteSport: 'velo',
  favoriteSubtype: 'route',
  defaultSpeeds: {
    'velo-route': 20,
    'velo-vtt': 14,
    'course-route': 9,
    'course-trail': 8,
    'course-montagne': 6,
    'course-campagne': 9,
  },
  maxDistanceKm: 50,
  maxElevationM: null,
  defaultStart: null,
  defaultStartLabel: '',
  routingProvider: 'osrm',
};
