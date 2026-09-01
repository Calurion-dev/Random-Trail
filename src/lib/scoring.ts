import { DEFAULT_SPEEDS, DIFFICULTY_MULTIPLIER, TERRAIN_FACTOR } from '../constants/sports';
import type { Difficulty, LatLng } from '../types';

export function getBaseSpeed(sport: string, subtype: string): number {
  const key = `${sport}-${subtype}`;
  return DEFAULT_SPEEDS[key] ?? 10;
}

export function estimateDuration(
  distanceKm: number,
  ascentMeters: number,
  sport: string,
  subtype: string,
  difficulty: Difficulty
): number {
  const baseSpeed = getBaseSpeed(sport, subtype);
  const terrainFactor = TERRAIN_FACTOR[`${sport}-${subtype}`] ?? 1;
  const diffMult = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;

  if (sport === 'course') {
    // Naismith-like: time = distance/speed *60*terrain + ascent*0.1 min
    const duration = (distanceKm / baseSpeed) * 60 * terrainFactor + ascentMeters * 0.1;
    return Math.max(5, Math.round(duration));
  } else {
    // vélo
    const distanceMeters = distanceKm * 1000;
    const avgGrade = ascentMeters / Math.max(distanceMeters, 1);
    const adjustedSpeed = baseSpeed * diffMult * Math.min(1.2, Math.max(0.4, 1 - avgGrade * 5)) / terrainFactor;
    const duration = (distanceKm / Math.max(adjustedSpeed, 3)) * 60;
    return Math.max(5, Math.round(duration));
  }
}

export function computeDifficultyScore(
  distanceKm: number,
  ascentM: number,
  sport: string,
  subtype: string
): number {
  const terrainFactor = TERRAIN_FACTOR[`${sport}-${subtype}`] ?? 1;
  const distanceComp = Math.min(40, (distanceKm / 50) * 40); // 0-40 (50km max ref)
  const ascentComp = Math.min(40, (ascentM / 1500) * 40); // 0-40 (1500m ref)
  const terrainComp = Math.min(20, ((terrainFactor - 1) / 0.6) * 20); // 0-20
  return Math.round(Math.min(100, distanceComp + ascentComp + terrainComp));
}

export function computeGlobalScore(opts: {
  targetDistanceM: number | null;
  actualDistanceM: number;
  maxDistanceM: number | null;
  maxElevationM: number | null;
  actualAscentM: number;
  poiCount: number;
  isLoopClosed: boolean;
  routingOk: boolean;
  terrainMatch: boolean;
}): number {
  let score = 100;
  if (opts.targetDistanceM && opts.targetDistanceM > 0) {
    const err = Math.abs(opts.actualDistanceM - opts.targetDistanceM) / opts.targetDistanceM;
    score -= Math.min(30, err * 60); // up to -30
  }
  if (opts.maxDistanceM && opts.actualDistanceM > opts.maxDistanceM) {
    const over = (opts.actualDistanceM - opts.maxDistanceM) / opts.maxDistanceM;
    score -= Math.min(25, over * 50 + 10);
  }
  if (opts.maxElevationM !== null && opts.maxElevationM !== undefined && opts.actualAscentM > opts.maxElevationM) {
    const over = (opts.actualAscentM - opts.maxElevationM) / Math.max(opts.maxElevationM, 100);
    score -= Math.min(20, over * 30 + 10);
  }
  if (opts.poiCount > 0) score += 5;
  if (opts.terrainMatch) score += 3;
  if (opts.isLoopClosed) score += 5;
  if (!opts.routingOk) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeAscentDescent(elevations: number[]): { ascent: number; descent: number; min: number | null; max: number | null } {
  if (!elevations.length) return { ascent: 0, descent: 0, min: null, max: null };
  let ascent = 0;
  let descent = 0;
  let min = elevations[0];
  let max = elevations[0];
  const threshold = 3; // ignore tiny jitter <3m
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > threshold) ascent += diff;
    else if (diff < -threshold) descent += Math.abs(diff);
    if (elevations[i] < min) min = elevations[i];
    if (elevations[i] > max) max = elevations[i];
  }
  return { ascent: Math.round(ascent), descent: Math.round(descent), min: Math.round(min), max: Math.round(max) };
}

// Simple deterministic PRNG (mulberry32)
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateCandidateWaypoints(
  start: LatLng,
  targetDistanceKm: number,
  directionDeg: number,
  routeType: string,
  manualWaypoints: LatLng[],
  seed: number,
  candidateIdx: number
): LatLng[] {
  if (manualWaypoints.length > 0) {
    return [...manualWaypoints];
  }
  const rand = mulberry32(seed + candidateIdx * 9999);
  const jitter = () => (rand() - 0.5) * 40; // +-20 deg
  const distanceJitter = () => 0.8 + rand() * 0.4; // 0.8-1.2

  const points: LatLng[] = [];

  // helper destination
  function dest(from: LatLng, distKm: number, bearing: number): LatLng {
    const R = 6371;
    const d = distKm / R;
    const br = (bearing * Math.PI) / 180;
    const lat1 = (from.lat * Math.PI) / 180;
    const lon1 = (from.lng * Math.PI) / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br));
    const lon2 =
      lon1 +
      Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    return { lat: (lat2 * 180) / Math.PI, lng: (lon2 * 180) / Math.PI };
  }

  if (routeType === 'boucle') {
    // boucle: 2-3 intermediate points around start forming a loop
    const radius = (targetDistanceKm / (2 * Math.PI)) * 1.1; // approximate radius for loop circumference
    // create 2 or 3 points distributed
    const num = 2 + Math.floor(rand() * 2); // 2 or 3
    const baseBearings = Array.from({ length: num }, (_, i) => directionDeg + (360 / num) * i + jitter());
    // order them to make a loop roughly circular
    for (let i = 0; i < num; i++) {
      const b = baseBearings[i];
      const r = radius * distanceJitter() * (0.9 + num * 0.15);
      points.push(dest(start, r, b));
    }
  } else if (routeType === 'aller-retour') {
    const half = (targetDistanceKm / 2) * distanceJitter();
    const b = directionDeg + jitter();
    points.push(dest(start, half, b));
  } else if (routeType === 'a-b') {
    const b = directionDeg + jitter();
    const d = targetDistanceKm * distanceJitter();
    points.push(dest(start, d, b));
  } else if (routeType === 'etapes' || routeType === 'multi-points') {
    // generate 2-4 steps along direction with lateral spread
    const steps = 2 + Math.floor(rand() * 3); // 2-4
    const stepDist = targetDistanceKm / steps;
    let cur = start;
    for (let i = 0; i < steps; i++) {
      const b = directionDeg + jitter() * 0.7;
      const d = stepDist * distanceJitter();
      cur = dest(cur, d, b);
      points.push(cur);
    }
  } else {
    // fallback simple
    points.push(dest(start, targetDistanceKm * 0.5, directionDeg + jitter()));
  }

  return points;
}
