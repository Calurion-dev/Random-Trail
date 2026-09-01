import * as turf from '@turf/turf';
import type { LonLat, LatLng } from '../types';

export function nearestPointOnRoute(pos: LatLng, route: LonLat[]) {
  if (!route.length) return null;
  const pt = turf.point([pos.lng, pos.lat]);
  const line = turf.lineString(route);
  const snapped = turf.nearestPointOnLine(line, pt, { units: 'meters' });
  return snapped;
}

export function remainingDistance(pos: LatLng, route: LonLat[]): number {
  const snapped = nearestPointOnRoute(pos, route);
  if (!snapped) return 0;
  const idx = snapped.properties.index as number;
  // compute length from snapped point to end
  const line = turf.lineString(route);
  const total = turf.length(line, { units: 'meters' });
  const before = turf.lineSlice(turf.point(route[0]), turf.point([snapped.geometry.coordinates[0], snapped.geometry.coordinates[1]]), line);
  // Actually use location along line
  const loc = snapped.properties.location as number; // km along line
  const totalKm = turf.length(line, { units: 'kilometers' });
  const remainingKm = Math.max(0, totalKm - loc);
  return remainingKm * 1000;
}

export function remainingAscent(pos: LatLng, route: LonLat[], profile: { dist: number; ele: number }[]): number {
  if (!profile.length) return 0;
  // find nearest dist
  const snapped = nearestPointOnRoute(pos, route);
  if (!snapped) return 0;
  const locKm = snapped.properties.location as number;
  const locM = locKm * 1000;
  // find index in profile closest to locM
  let idx = 0;
  let best = Infinity;
  for (let i = 0; i < profile.length; i++) {
    const d = Math.abs(profile[i].dist - locM);
    if (d < best) { best = d; idx = i; }
  }
  let ascent = 0;
  const threshold = 3;
  for (let i = idx + 1; i < profile.length; i++) {
    const diff = profile[i].ele - profile[i - 1].ele;
    if (diff > threshold) ascent += diff;
  }
  return Math.round(ascent);
}

export function bearingToNext(pos: LatLng, route: LonLat[], lookAheadM = 100): number {
  const snapped = nearestPointOnRoute(pos, route);
  if (!snapped) return 0;
  const line = turf.lineString(route);
  const locKm = snapped.properties.location as number;
  const totalKm = turf.length(line, { units: 'kilometers' });
  const aheadKm = locKm + lookAheadM / 1000;
  const clamped = Math.min(aheadKm, totalKm);
  const aheadPt = turf.along(line, clamped, { units: 'kilometers' });
  const br = turf.bearing(turf.point([pos.lng, pos.lat]), aheadPt);
  return (br + 360) % 360;
}

export function isOffRoute(pos: LatLng, route: LonLat[], thresholdM = 50): boolean {
  const pt = turf.point([pos.lng, pos.lat]);
  const line = turf.lineString(route);
  const snapped = turf.nearestPointOnLine(line, pt, { units: 'meters' });
  const dist = turf.distance(pt, snapped, { units: 'meters' });
  return dist > thresholdM;
}

export function distanceToRoute(pos: LatLng, route: LonLat[]): number {
  const pt = turf.point([pos.lng, pos.lat]);
  const line = turf.lineString(route);
  const snapped = turf.nearestPointOnLine(line, pt, { units: 'meters' });
  return turf.distance(pt, snapped, { units: 'meters' });
}

export function formatPace(speedKmh: number | null, sport: string): string {
  if (speedKmh === null || speedKmh <= 0) return '—';
  if (sport === 'velo') return `${speedKmh.toFixed(1)} km/h`;
  // running: pace min/km
  const pace = 60 / speedKmh;
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export function frenchInstruction(maneuver?: string, modifier?: string, name?: string): string {
  const mod = (modifier || '').toLowerCase();
  const man = (maneuver || '').toLowerCase();
  if (man.includes('depart')) return 'Départ';
  if (man.includes('arrive')) return 'Arrivée';
  if (man.includes('roundabout') || man.includes('rotary')) return 'Au rond-point, continuez';
  if (man.includes('uturn') || mod.includes('uturn')) return 'Faites demi-tour';
  if (mod.includes('sharp right')) return 'Virez fortement à droite';
  if (mod.includes('sharp left')) return 'Virez fortement à gauche';
  if (mod.includes('slight right')) return 'Légèrement à droite';
  if (mod.includes('slight left')) return 'Légèrement à gauche';
  if (mod.includes('right')) return 'Tournez à droite';
  if (mod.includes('left')) return 'Tournez à gauche';
  if (mod.includes('straight') || man.includes('continue')) return 'Continuez tout droit';
  return name ? `Continuez sur ${name}` : 'Continuez tout droit';
}
