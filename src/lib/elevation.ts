import { API } from '../constants/api';
import type { LonLat } from '../types';
import { computeAscentDescent } from './scoring';

const elevationCache = new Map<string, number[]>();

function cacheKey(coords: LonLat[]): string {
  return coords.map((c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`).join('|');
}

export async function fetchElevations(coords: LonLat[]): Promise<number[]> {
  if (!coords.length) return [];
  // sample to ~150 points max
  const maxPoints = 160;
  let sampled = coords;
  if (coords.length > maxPoints) {
    const step = Math.ceil(coords.length / maxPoints);
    sampled = coords.filter((_, i) => i % step === 0);
    if (sampled[sampled.length - 1] !== coords[coords.length - 1]) sampled.push(coords[coords.length - 1]);
  }

  const key = cacheKey(sampled);
  if (elevationCache.has(key)) return elevationCache.get(key)!;

  const lats = sampled.map((c) => c[1]);
  const lons = sampled.map((c) => c[0]);

  const url = `${API.ELEVATION}?latitude=${lats.join(',')}&longitude=${lons.join(',')}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`elevation ${res.status}`);
    const data = await res.json();
    const elevations: number[] = data.elevation ?? [];
    // if length mismatch, pad
    const final = elevations.length === sampled.length ? elevations : sampled.map((_, i) => elevations[i] ?? 0);
    elevationCache.set(key, final);
    if (elevationCache.size > 100) {
      const first = elevationCache.keys().next().value;
      if (first) elevationCache.delete(first);
    }
    return final;
  } catch {
    // graceful degrade: return zeros
    return sampled.map(() => 0);
  }
}

export async function computeElevationStats(coords: LonLat[]): Promise<{
  ascent: number;
  descent: number;
  min: number | null;
  max: number | null;
  profile: { dist: number; ele: number }[];
  elevations: number[];
}> {
  const elevations = await fetchElevations(coords);
  const { ascent, descent, min, max } = computeAscentDescent(elevations);

  // build distance profile using haversine approx
  const profile: { dist: number; ele: number }[] = [];
  let cum = 0;
  const sampled = coords.length > elevations.length ? sampleToLength(coords, elevations.length) : coords;
  for (let i = 0; i < elevations.length; i++) {
    if (i > 0) {
      const [lon1, lat1] = sampled[i - 1];
      const [lon2, lat2] = sampled[i];
      cum += haversine(lat1, lon1, lat2, lon2);
    }
    profile.push({ dist: cum, ele: elevations[i] });
  }

  return { ascent, descent, min, max, profile, elevations };
}

function sampleToLength(coords: LonLat[], target: number): LonLat[] {
  if (coords.length === target) return coords;
  const step = coords.length / target;
  const out: LonLat[] = [];
  for (let i = 0; i < target; i++) out.push(coords[Math.floor(i * step)]);
  return out;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
