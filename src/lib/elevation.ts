import { API } from '../constants/api';
import type { LonLat } from '../types';
import { computeAscentDescent } from './scoring';

const elevationCache = new Map<string, number[]>();

function cacheKey(coords: LonLat[]): string {
  return coords.map((c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`).join('|');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchChunk(lats: number[], lons: number[]): Promise<number[]> {
  const url = `${API.ELEVATION}?latitude=${lats.join(',')}&longitude=${lons.join(',')}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`elevation ${res.status}`);
  const data = await res.json();
  const elevations: number[] = data.elevation ?? [];
  if (elevations.length !== lats.length) {
    // API parfois tronque en cas d'erreur — compléter avec dernier connu ou 0
    const filled = lats.map((_, i) => (elevations[i] ?? elevations[elevations.length - 1] ?? 0));
    return filled;
  }
  return elevations;
}

export async function fetchElevations(coords: LonLat[]): Promise<number[]> {
  if (!coords.length) return [];
  // échantillonner à ~160 points max pour limiter taille URL tout en gardant forme
  const maxPoints = 160;
  let sampled = coords;
  if (coords.length > maxPoints) {
    const step = Math.ceil(coords.length / maxPoints);
    sampled = coords.filter((_, i) => i % step === 0);
    if (sampled[sampled.length - 1] !== coords[coords.length - 1]) sampled.push(coords[coords.length - 1]);
  }

  const key = cacheKey(sampled);
  if (elevationCache.has(key)) return elevationCache.get(key)!;

  // découper en chunks de 80 pour URL courte et robustesse (Open-Meteo OK jusqu'à ~500 mais 80 est safe)
  const CHUNK = 80;
  const chunks = chunk(sampled, CHUNK);
  const allElevations: number[] = [];

  for (const c of chunks) {
    const lats = c.map((x) => x[1]);
    const lons = c.map((x) => x[0]);
    let attempt = 0;
    let elevations: number[] | null = null;
    while (attempt < 2 && !elevations) {
      try {
        elevations = await fetchChunk(lats, lons);
      } catch (e) {
        attempt++;
        if (attempt >= 2) throw e;
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    if (elevations) allElevations.push(...elevations);
  }

  // Si la taille ne correspond pas (cas limite), ajuster
  const final = allElevations.length === sampled.length
    ? allElevations
    : sampled.map((_, i) => allElevations[i] ?? allElevations[allElevations.length - 1] ?? 0);

  // Détection profil plat anormal (tous zéros) → ne pas cacher, retourner tel quel mais ne pas polluer le cache avec zéros
  const allZero = final.length > 0 && final.every((v) => v === 0);
  if (!allZero) {
    elevationCache.set(key, final);
    if (elevationCache.size > 100) {
      const first = elevationCache.keys().next().value;
      if (first) elevationCache.delete(first);
    }
  }
  return final;
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

  // Construire profil : associer chaque élévation échantillonnée à sa distance cumulée réelle sur sampled
  // Si elevations.length != coords.length, on aligne sur sampled (déjà déduit dans fetchElevations)
  // Pour garder cohérence distance totale, on interpole les distances sur sampled
  const sampled = coords.length > elevations.length ? sampleToLength(coords, elevations.length) : coords.slice(0, elevations.length);
  // Si on a dû échantillonner coords pour fetch, sampled_ref est la même liste que celle fetchée
  // Re-déduire sampled_ref fiable : reconstruire même échantillonnage que fetchElevations
  let sampledForDist = coords;
  if (coords.length > 160) {
    const step = Math.ceil(coords.length / 160);
    sampledForDist = coords.filter((_, i) => i % step === 0);
    if (sampledForDist[sampledForDist.length - 1] !== coords[coords.length - 1]) sampledForDist.push(coords[coords.length - 1]);
    // chunking n'affecte pas l'ordre
  } else {
    sampledForDist = sampled;
  }
  // Si mismatch résiduel, ajuster
  const distCoords = sampledForDist.length === elevations.length ? sampledForDist : sampled;

  const profile: { dist: number; ele: number }[] = [];
  let cum = 0;
  for (let i = 0; i < elevations.length; i++) {
    if (i > 0) {
      const [lon1, lat1] = distCoords[i - 1];
      const [lon2, lat2] = distCoords[i];
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
