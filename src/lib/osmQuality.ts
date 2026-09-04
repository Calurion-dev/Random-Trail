// Analyse qualité terrain best-effort via Overpass
import { API } from '../constants/api';
import type { LonLat } from '../types';

export interface QualityInfo {
  roadExposure: number; // 0-1 : part de grandes routes
  cyclewayRatio: number; // 0-1
  pathRatio: number; // 0-1 : sentiers/path/track
  totalWays: number;
  summary: string;
}

const cache = new Map<string, QualityInfo>();

function bboxFromCoords(coords: LonLat[]): string {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  const sampled = coords.length > 50 ? coords.filter((_, i) => i % Math.ceil(coords.length / 50) === 0) : coords;
  for (const [lon, lat] of sampled) {
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
  }
  const pad = 0.015;
  return `${minLat - pad},${minLon - pad},${maxLat + pad},${maxLon + pad}`;
}

export async function estimateQuality(coords: LonLat[]): Promise<QualityInfo | null> {
  if (!coords.length) return null;
  const key = bboxFromCoords(coords) + '|' + coords.length;
  if (cache.has(key)) return cache.get(key)!;

  const bbox = bboxFromCoords(coords);
  // Query ways with highway tag in bbox, limit to 200
  const query = `[out:json][timeout:12];(way["highway"](${bbox}););out tags 200;`;
  try {
    const res = await fetch(API.OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error('overpass quality ' + res.status);
    const data = await res.json();
    const ways: any[] = data.elements || [];
    if (!ways.length) {
      const neutral: QualityInfo = { roadExposure: 0.2, cyclewayRatio: 0.15, pathRatio: 0.3, totalWays: 0, summary: 'Données OSM insuffisantes dans la zone' };
      cache.set(key, neutral);
      return neutral;
    }
    let major = 0; // primary, trunk, secondary, tertiary, motorway
    let cycleway = 0;
    let path = 0;
    for (const w of ways) {
      const hw = w.tags?.highway || '';
      const cycle = w.tags?.cycleway || w.tags?.['cycleway:left'] || w.tags?.['cycleway:right'];
      if (['motorway', 'trunk', 'primary', 'secondary', 'tertiary'].includes(hw)) major++;
      if (['cycleway', 'path', 'footway', 'track'].includes(hw)) {
        if (hw === 'cycleway') cycleway++;
        else path++;
      }
      if (cycle) cycleway++;
    }
    const total = ways.length || 1;
    const info: QualityInfo = {
      roadExposure: Math.min(1, major / total),
      cyclewayRatio: Math.min(1, cycleway / total),
      pathRatio: Math.min(1, path / total),
      totalWays: ways.length,
      summary: `${ways.length} voies analysées — ${Math.round((major / total) * 100)}% grandes routes, ${Math.round((cycleway / total) * 100)}% pistes cyclables, ${Math.round((path / total) * 100)}% sentiers/chemins`,
    };
    cache.set(key, info);
    if (cache.size > 50) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    return info;
  } catch {
    // graceful degrade
    return { roadExposure: 0.3, cyclewayRatio: 0.2, pathRatio: 0.2, totalWays: 0, summary: 'Analyse qualité indisponible (Overpass)' };
  }
}

export function qualityToScore(info: QualityInfo | null, sport: string, subtype: string): number {
  if (!info) return 0;
  // Bonus if terrain matches preference
  const isVelo = sport === 'velo';
  const wantsCycle = isVelo && subtype === 'route';
  const wantsPath = subtype === 'vtt' || subtype === 'trail' || subtype === 'montagne';
  let bonus = 0;
  if (wantsCycle && info.cyclewayRatio > 0.2) bonus += 5;
  if (wantsPath && info.pathRatio > 0.25) bonus += 5;
  if (info.roadExposure < 0.2) bonus += 3;
  if (info.roadExposure > 0.5) bonus -= 5;
  return bonus;
}
