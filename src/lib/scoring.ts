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
    const duration = (distanceKm / baseSpeed) * 60 * terrainFactor + ascentMeters * 0.1;
    return Math.max(5, Math.round(duration));
  } else {
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
  const distanceComp = Math.min(40, (distanceKm / 50) * 40);
  const ascentComp = Math.min(40, (ascentM / 1500) * 40);
  const terrainComp = Math.min(20, ((terrainFactor - 1) / 0.6) * 20);
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
    score -= Math.min(30, err * 60);
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
  const threshold = 3;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > threshold) ascent += diff;
    else if (diff < -threshold) descent += Math.abs(diff);
    if (elevations[i] < min) min = elevations[i];
    if (elevations[i] > max) max = elevations[i];
  }
  return { ascent: Math.round(ascent), descent: Math.round(descent), min: Math.round(min), max: Math.round(max) };
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Destination point given distance/bearing
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

function roadFactorFor(sport?: string, subtype?: string): number {
  const key = sport && subtype ? `${sport}-${subtype}` : '';
  const map: Record<string, number> = {
    'velo-route': 1.18,
    'velo-vtt': 1.35,
    'course-route': 1.12,
    'course-campagne': 1.18,
    'course-trail': 1.32,
    'course-montagne': 1.38,
  };
  return map[key] ?? 1.28;
}

function havKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function totalStraightKm(start: LatLng, pts: LatLng[], routeType: string): number {
  if (!pts.length) return 0;
  let sum = 0;
  let prev: LatLng = start;
  for (const p of pts) {
    sum += havKm(prev, p);
    prev = p;
  }
  if (routeType === 'boucle' || routeType === 'aller-retour') sum += havKm(prev, start);
  return sum;
}

/**
 * Génération cohérente des waypoints.
 * - roadFactor adapté au sport (route vs VTT/trail)
 * - forme elliptique orientée directionDeg, sans croisement
 * - correction d'échelle post-génération pour coller à distance cible (vol d'oiseau → route réelle)
 * - dérive latérale limitée, distinction claire des types de parcours
 * - prise en compte loops (boucles multiples)
 */
export function generateCandidateWaypoints(
  start: LatLng,
  targetDistanceKm: number,
  directionDeg: number,
  routeType: string,
  manualWaypoints: LatLng[],
  seed: number,
  candidateIdx: number,
  opts?: { sport?: string; subtype?: string; loops?: number }
): LatLng[] {
  if (manualWaypoints.length > 0) {
    return [...manualWaypoints];
  }
  const rand = mulberry32(seed + candidateIdx * 9999);
  const jitterSmall = () => (rand() - 0.5) * 18; // ±9°
  const jitterMed = () => (rand() - 0.5) * 30; // ±15°
  const lateralSign = candidateIdx % 2 === 0 ? 1 : -1;

  const roadFactor = roadFactorFor(opts?.sport, opts?.subtype);
  // Pour boucles multiples, on vise la distance totale ; facteur légèrement augmenté car plus de sinuosité
  const loops = Math.max(1, opts?.loops ?? 1);
  const loopFactor = routeType === 'boucle' && loops > 1 ? 1 + (loops - 1) * 0.06 : 1;
  const effectiveRoadFactor = roadFactor * loopFactor;

  const buildBoucle = (): LatLng[] => {
    const a = (targetDistanceKm / effectiveRoadFactor) * 0.38;
    const b = (targetDistanceKm / effectiveRoadFactor) * 0.18;
    const num = targetDistanceKm < 10 ? 2 : 3;
    let pts: LatLng[];
    let bearings: number[] = [];
    let dists: number[] = [];
    if (num === 2) {
      bearings = [directionDeg + 55 * lateralSign + jitterSmall(), directionDeg - 55 * lateralSign + jitterSmall()];
      dists = [a * 0.9, a * 0.9];
      pts = bearings.map((br, i) => dest(start, dists[i], br));
      if (lateralSign < 0) pts.reverse();
    } else {
      bearings = [
        directionDeg + jitterSmall(),
        directionDeg + 48 * lateralSign + jitterMed() * 0.6,
        directionDeg - 48 * lateralSign + jitterMed() * 0.6,
      ];
      dists = [a, b * 1.9, b * 1.9];
      pts = bearings.map((br, i) => dest(start, dists[i], br));
      pts.sort((pa, pb) => {
        const ba = (Math.atan2(pa.lng - start.lng, pa.lat - start.lat) * 180) / Math.PI;
        const bb = (Math.atan2(pb.lng - start.lng, pb.lat - start.lat) * 180) / Math.PI;
        const da = ((ba - directionDeg + 540) % 360) - 180;
        const db = ((bb - directionDeg + 540) % 360) - 180;
        return da - db;
      });
      // keep bearings/dists aligned after sort is not needed — we rescale radialement below
      bearings = pts.map((p) => (Math.atan2(p.lng - start.lng, p.lat - start.lat) * 180) / Math.PI);
      dists = pts.map((p) => havKm(start, p));
    }
    // Correction d'échelle : ajuster distance vol d'oiseau pour que route ≈ cible
    const straight = totalStraightKm(start, pts, 'boucle');
    const expectedStraight = targetDistanceKm / effectiveRoadFactor;
    const scale = Math.max(0.65, Math.min(1.5, expectedStraight / Math.max(straight, 0.1)));
    if (Math.abs(scale - 1) > 0.04) {
      pts = pts.map((_, i) => dest(start, dists[i] * scale, bearings[i]));
      // re-trier après mise à l'échelle pour conserver convexité
      if (pts.length === 3) {
        pts.sort((pa, pb) => {
          const ba = (Math.atan2(pa.lng - start.lng, pa.lat - start.lat) * 180) / Math.PI;
          const bb = (Math.atan2(pb.lng - start.lng, pb.lat - start.lat) * 180) / Math.PI;
          return ((ba - directionDeg + 540) % 360) - 180 - (((bb - directionDeg + 540) % 360) - 180);
        });
      }
    }
    return pts;
  };

  if (routeType === 'boucle') {
    return buildBoucle();
  }

  if (routeType === 'aller-retour') {
    let half = (targetDistanceKm / 2 / effectiveRoadFactor) * (0.92 + rand() * 0.16);
    const br = directionDeg + jitterSmall() * 0.7;
    // correction : straight aller-retour = 2*half → doit valoir expectedStraight
    const expectedStraight = targetDistanceKm / effectiveRoadFactor;
    const straight = 2 * half;
    const scale = Math.max(0.7, Math.min(1.4, expectedStraight / Math.max(straight, 0.1)));
    half *= scale;
    return [dest(start, half, br)];
  }

  if (routeType === 'a-b') {
    let d = (targetDistanceKm / effectiveRoadFactor) * (0.95 + rand() * 0.1);
    const br = directionDeg + jitterSmall();
    const expectedStraight = targetDistanceKm / effectiveRoadFactor;
    const scale = Math.max(0.7, Math.min(1.4, expectedStraight / Math.max(d, 0.1)));
    d *= scale;
    return [dest(start, d, br)];
  }

  if (routeType === 'etapes' || routeType === 'multi-points') {
    const steps = targetDistanceKm < 12 ? 2 : targetDistanceKm < 25 ? 3 : 4;
    const stepBaseRaw = targetDistanceKm / steps / effectiveRoadFactor;
    let cur = start;
    const pts: LatLng[] = [];
    let drift = 0;
    // génération initiale
    const bearings: number[] = [];
    const segDists: number[] = [];
    for (let i = 0; i < steps; i++) {
      drift += (rand() - 0.5) * 12;
      drift = Math.max(-18, Math.min(18, drift));
      const b = directionDeg + drift + jitterSmall() * 0.4;
      const d = stepBaseRaw * (0.9 + rand() * 0.2);
      bearings.push(b);
      segDists.push(d);
      cur = dest(cur, d, b);
      pts.push(cur);
    }
    // correction d'échelle globale
    const straight = totalStraightKm(start, pts, routeType);
    const expectedStraight = targetDistanceKm / effectiveRoadFactor;
    const scale = Math.max(0.65, Math.min(1.5, expectedStraight / Math.max(straight, 0.1)));
    if (Math.abs(scale - 1) > 0.04) {
      cur = start;
      for (let i = 0; i < steps; i++) {
        cur = dest(cur, segDists[i] * scale, bearings[i]);
        pts[i] = cur;
      }
    }
    return pts;
  }

  // fallback
  return [dest(start, (targetDistanceKm * 0.5) / effectiveRoadFactor, directionDeg + jitterSmall())];
}
