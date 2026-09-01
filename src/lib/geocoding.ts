import { API } from '../constants/api';
import type { GeocodingResult } from '../types';

const cache = new Map<string, GeocodingResult[]>();

export async function searchAddress(q: string): Promise<GeocodingResult[]> {
  const trimmed = q.trim();
  if (!trimmed || trimmed.length < 3) return [];
  if (cache.has(trimmed)) return cache.get(trimmed)!;

  const url = `${API.NOMINATIM_SEARCH}?format=json&limit=5&q=${encodeURIComponent(trimmed)}&countrycodes=fr&accept-language=fr&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data = await res.json();
    const results: GeocodingResult[] = (data as any[]).map((item) => ({
      label: item.display_name as string,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      raw: item,
    }));
    cache.set(trimmed, results);
    if (cache.size > 50) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    return results;
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = `${API.NOMINATIM_REVERSE}?format=json&lat=${lat}&lon=${lon}&accept-language=fr`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.display_name as string) || null;
  } catch {
    return null;
  }
}
