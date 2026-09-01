export type Sport = 'velo' | 'course';
export type SubtypeVelo = 'route' | 'vtt';
export type SubtypeCourse = 'route' | 'trail' | 'montagne' | 'campagne';
export type Subtype = SubtypeVelo | SubtypeCourse;

export type RouteType = 'boucle' | 'aller-retour' | 'a-b' | 'etapes' | 'multi-points';
export type Difficulty = 'debutant' | 'intermediaire' | 'avance';
export type DirectionLabel = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'custom';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Coords {
  lon: number;
  lat: number;
}

export type LonLat = [number, number]; // [lon, lat]

export interface GeneratorParams {
  sport: Sport;
  subtype: Subtype;
  start: LatLng | null;
  startLabel: string;
  routeType: RouteType;
  distanceKm: number | null;
  durationMinutes: number | null;
  directionDeg: number; // 0-359
  directionLabel: DirectionLabel;
  loops: number;
  difficulty: Difficulty;
  maxElevation: number | null;
  maxDistanceKm: number | null;
  terrainPrefs: {
    pisteCyclable: boolean;
    sentiers: boolean;
    eviterGrandesRoutes: boolean;
    eviterChemins: boolean;
  };
  poiPrefs: {
    include: boolean;
    types: PoiType[];
  };
  manualMode: boolean;
  waypoints: LatLng[];
  seed: number;
}

export type PoiType = 'drinking_water' | 'toilets' | 'shelter' | 'bench' | 'viewpoint';

export interface Poi {
  id: string;
  type: PoiType;
  lat: number;
  lng: number;
  name?: string;
  tags?: Record<string, string>;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver?: string;
  modifier?: string;
}

export interface GeneratedRoute {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sport: Sport;
  subtype: Subtype;
  routeType: RouteType;
  source: 'automatic' | 'manual' | 'imported' | 'shared';
  params: GeneratorParams;
  coordinates: LonLat[];
  simplifiedCoordinates: LonLat[];
  distanceMeters: number;
  ascentMeters: number;
  descentMeters: number;
  minElevation: number | null;
  maxElevation: number | null;
  estimatedDurationSeconds: number;
  difficultyScore: number;
  globalScore: number;
  steps: RouteStep[];
  pois: Poi[];
  elevationProfile: { dist: number; ele: number }[];
}

export interface SavedRoute extends GeneratedRoute {
  notes?: string;
}

export interface GeocodingResult {
  label: string;
  lat: number;
  lng: number;
  raw: unknown;
}

export interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  lastStart: LatLng | null;
  lastStartLabel: string;
  favoriteSport: Sport;
  favoriteSubtype: Subtype;
  defaultSpeeds: Record<string, number>;
  maxDistanceKm: number;
  maxElevationM: number | null;
  defaultStart: LatLng | null;
  defaultStartLabel: string;
}

export interface ActivityState {
  route: GeneratedRoute | null;
  watching: boolean;
  currentPos: LatLng | null;
  remainingMeters: number;
  remainingAscent: number;
  speedKmh: number | null;
  offRoute: boolean;
  bearingToNext: number;
  nextInstruction: string | null;
}
