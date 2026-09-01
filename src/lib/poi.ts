import { API } from '../constants/api';
import type { LonLat, Poi, PoiType } from '../types';

export async function fetchPoisNearRoute(coords: LonLat[], types: PoiType[], limit = 20): Promise<Poi[]> {
  if (!types.length || !coords.length) return [];
  // Simplify to bbox
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  const sampled = coords.length > 40 ? coords.filter((_, i) => i % Math.ceil(coords.length / 40) === 0) : coords;
  for (const [lon, lat] of sampled) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  // expand bbox slightly
  const pad = 0.02; // ~2km
  minLat -= pad; maxLat += pad; minLon -= pad; maxLon += pad;

  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;

  // Map PoiType to OSM tags
  const tagMap: Record<PoiType, string> = {
    drinking_water: '["amenity"="drinking_water"]',
    toilets: '["amenity"="toilets"]',
    shelter: '["amenity"="shelter"]',
    bench: '["amenity"="bench"]',
    viewpoint: '["tourism"="viewpoint"]',
  };

  const queries = types.map((t) => `node${tagMap[t]}(${bbox});`).join('\n');

  const query = `[out:json][timeout:15];(\n${queries}\n);out ${limit};`;

  try {
    const res = await fetch(API.OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`overpass ${res.status}`);
    const data = await res.json();
    const elements = data.elements || [];
    const pois: Poi[] = elements.slice(0, limit).map((el: any) => ({
      id: String(el.id),
      type: inferType(el.tags),
      lat: el.lat,
      lng: el.lon,
      name: el.tags?.name,
      tags: el.tags,
    }));
    return pois;
  } catch {
    return [];
  }
}

function inferType(tags: Record<string, string> = {}): PoiType {
  if (tags.amenity === 'drinking_water') return 'drinking_water';
  if (tags.amenity === 'toilets') return 'toilets';
  if (tags.amenity === 'shelter') return 'shelter';
  if (tags.amenity === 'bench') return 'bench';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  return 'bench';
}
