import type { Sport, Subtype, RouteType, Difficulty } from '../types';

export const SPORTS: { value: Sport; label: string }[] = [
  { value: 'velo', label: 'Vélo' },
  { value: 'course', label: 'Course à pied' },
];

export const SUBTYPES_VELO: { value: Subtype; label: string }[] = [
  { value: 'route', label: 'Vélo de route' },
  { value: 'vtt', label: 'VTT' },
];

export const SUBTYPES_COURSE: { value: Subtype; label: string }[] = [
  { value: 'route', label: 'Route' },
  { value: 'trail', label: 'Trail' },
  { value: 'montagne', label: 'Montagne' },
  { value: 'campagne', label: 'Campagne' },
];

export const ROUTE_TYPES: { value: RouteType; label: string }[] = [
  { value: 'boucle', label: 'Boucle' },
  { value: 'aller-retour', label: 'Aller-retour' },
  { value: 'a-b', label: 'Point A à point B' },
  { value: 'etapes', label: 'Itinéraire avec étapes' },
  { value: 'multi-points', label: 'Parcours multi-points' },
];

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
];

export const DIRECTIONS = [
  { label: 'Nord', deg: 0, code: 'N' },
  { label: 'Nord-Est', deg: 45, code: 'NE' },
  { label: 'Est', deg: 90, code: 'E' },
  { label: 'Sud-Est', deg: 135, code: 'SE' },
  { label: 'Sud', deg: 180, code: 'S' },
  { label: 'Sud-Ouest', deg: 225, code: 'SW' },
  { label: 'Ouest', deg: 270, code: 'W' },
  { label: 'Nord-Ouest', deg: 315, code: 'NW' },
] as const;

export const DEFAULT_SPEEDS: Record<string, number> = {
  'velo-route': 20,
  'velo-vtt': 14,
  'course-route': 9,
  'course-trail': 8,
  'course-montagne': 6,
  'course-campagne': 9,
};

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  debutant: 0.9,
  intermediaire: 1.0,
  avance: 1.15,
};

export const TERRAIN_FACTOR: Record<string, number> = {
  'velo-route': 1.0,
  'velo-vtt': 1.25,
  'course-route': 1.0,
  'course-campagne': 1.15,
  'course-trail': 1.3,
  'course-montagne': 1.6,
};
