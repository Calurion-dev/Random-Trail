import { API } from '../constants/api';
import type { LatLng, LonLat, RouteStep } from '../types';

export type RoutingProvider = 'osrm' | 'brouter' | 'valhalla';

const cache = new Map<string, { coords: LonLat[]; distance: number; duration: number; steps: RouteStep[] }>();
const lastCall = { time: 0 };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildCacheKey(provider: string, profile: string, coords: LonLat[]): string {
  return `${provider}:${profile}:${coords.map((c) => c.join(',')).join(';')}`;
}

function mapProfile(sport: string, subtype: string): string {
  if (sport === 'velo') return 'bike';
  return 'foot';
}

function mapBRouterProfile(sport: string, subtype: string): string {
  if (sport === 'velo') return subtype === 'vtt' ? 'mtb' : 'fastbike';
  // running: trekking is closest for trail/montagne
  if (subtype === 'montagne' || subtype === 'trail') return 'hiking-mountain';
  return 'hiking';
}

function buildLonLatList(start: LatLng, waypoints: LatLng[], routeType: string): LonLat[] {
  const lonLatPoints: LonLat[] = [];
  lonLatPoints.push([start.lng, start.lat]);
  for (const w of waypoints) lonLatPoints.push([w.lng, w.lat]);
  if (routeType === 'boucle' || routeType === 'aller-retour') {
    lonLatPoints.push([start.lng, start.lat]);
  }
  const filtered: LonLat[] = [];
  for (const p of lonLatPoints) {
    if (!filtered.length || filtered[filtered.length - 1][0] !== p[0] || filtered[filtered.length - 1][1] !== p[1]) {
      filtered.push(p);
    }
  }
  return filtered;
}

export async function fetchRoute(
  sport: string,
  subtype: string,
  waypoints: LatLng[],
  start: LatLng,
  routeType: string,
  provider: RoutingProvider = 'osrm'
): Promise<{ coordinates: LonLat[]; distance: number; steps: RouteStep[]; duration: number; provider: RoutingProvider }> {
  const filtered = buildLonLatList(start, waypoints, routeType);
  if (filtered.length < 2) throw new Error('Pas assez de points pour calculer un itinéraire');

  // Try provider with fallback to OSRM
  if (provider === 'brouter') {
    try {
      const res = await fetchRouteBRouter(sport, subtype, filtered);
      return { ...res, provider: 'brouter' };
    } catch (e) {
      console.warn('BRouter failed, fallback OSRM', e);
    }
  }
  if (provider === 'valhalla') {
    try {
      const res = await fetchRouteValhalla(sport, subtype, filtered);
      return { ...res, provider: 'valhalla' };
    } catch (e) {
      console.warn('Valhalla failed, fallback OSRM', e);
    }
  }
  const res = await fetchRouteOSRM(sport, subtype, filtered);
  return { ...res, provider: 'osrm' };
}

async function fetchRouteOSRM(sport: string, subtype: string, filtered: LonLat[]): Promise<{ coordinates: LonLat[]; distance: number; steps: RouteStep[]; duration: number }> {
  const profile = mapProfile(sport, subtype);
  const key = buildCacheKey('osrm', profile, filtered);
  if (cache.has(key)) {
    const c = cache.get(key)!;
    return { coordinates: c.coords, distance: c.distance, steps: c.steps, duration: c.duration };
  }
  const now = Date.now();
  const elapsed = now - lastCall.time;
  if (elapsed < 300) await sleep(300 - elapsed);
  lastCall.time = Date.now();

  const coordsStr = filtered.map((c) => `${c[0]},${c[1]}`).join(';');
  const url = `${API.OSRM_BASE}/${profile}/${coordsStr}?overview=full&geometries=geojson&steps=true`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('Service de routage OSRM indisponible (réseau).');
  }
  if (res.status === 429) throw new Error('Trop de requêtes OSRM, patientez.');
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Échec OSRM (${res.status}) ${txt.slice(0, 100)}`);
  }
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error(`Routage OSRM impossible: ${data.message || data.code}`);
  const route = data.routes[0];
  const coords: LonLat[] = route.geometry.coordinates as LonLat[];
  const steps: RouteStep[] = [];
  if (route.legs) {
    for (const leg of route.legs) if (leg.steps) for (const s of leg.steps) steps.push({ instruction: s.maneuver?.type ? `${s.maneuver.type} ${s.maneuver.modifier || ''}`.trim() : s.name || 'Continuer', distance: s.distance || 0, duration: s.duration || 0, maneuver: s.maneuver?.type, modifier: s.maneuver?.modifier });
  }
  const entry = { coords, distance: route.distance, duration: route.duration, steps };
  cache.set(key, entry);
  if (cache.size > 100) { const first = cache.keys().next().value; if (first) cache.delete(first); }
  return { coordinates: coords, distance: route.distance, steps, duration: route.duration };
}

async function fetchRouteBRouter(sport: string, subtype: string, filtered: LonLat[]): Promise<{ coordinates: LonLat[]; distance: number; steps: RouteStep[]; duration: number }> {
  const profile = mapBRouterProfile(sport, subtype);
  const key = buildCacheKey('brouter', profile, filtered);
  if (cache.has(key)) {
    const c = cache.get(key)!;
    return { coordinates: c.coords, distance: c.distance, steps: c.steps, duration: c.duration };
  }
  // BRouter API: https://brouter.de/brouter?lonlats=...&profile=...&alternativeidx=0&format=geojson
  const lonlats = filtered.map((c) => `${c[0]},${c[1]}`).join('|');
  const url = `https://brouter.de/brouter?lonlats=${encodeURIComponent(lonlats)}&profile=${profile}&alternativeidx=0&format=geojson`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`BRouter ${res.status}`);
  const data = await res.json();
  // BRouter geojson: Feature with geometry LineString, properties track-length, etc.
  const feature = data.features?.[0] || data;
  const coords: LonLat[] = feature.geometry?.coordinates as LonLat[];
  if (!coords?.length) throw new Error('BRouter: pas de géométrie');
  const distance = feature.properties?.['track-length'] ? parseFloat(feature.properties['track-length']) : estimateLength(coords);
  const duration = distance / 5; // approx 5 m/s fallback
  const steps: RouteStep[] = []; // BRouter ne fournit pas steps compatibles
  const entry = { coords, distance, duration, steps };
  cache.set(key, entry);
  return { coordinates: coords, distance, steps, duration };
}

async function fetchRouteValhalla(sport: string, subtype: string, filtered: LonLat[]): Promise<{ coordinates: LonLat[]; distance: number; steps: RouteStep[]; duration: number }> {
  // Public Valhalla instance: https://valhalla1.openstreetmap.de/route
  // Requires POST JSON: {locations:[{lat,lon}], costing:"bicycle"/"pedestrian", ...}
  const costing = sport === 'velo' ? (subtype === 'vtt' ? 'bicycle' : 'bicycle') : 'pedestrian';
  const key = buildCacheKey('valhalla', costing, filtered);
  if (cache.has(key)) {
    const c = cache.get(key)!;
    return { coordinates: c.coords, distance: c.distance, steps: c.steps, duration: c.duration };
  }
  const body = {
    locations: filtered.map(([lon, lat]) => ({ lat, lon })),
    costing,
    directions_options: { units: 'kilometers', language: 'fr-FR' },
  };
  const res = await fetch('https://valhalla1.openstreetmap.de/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Valhalla ${res.status}`);
  const data = await res.json();
  const trip = data.trip;
  if (!trip?.legs?.length) throw new Error('Valhalla: pas de trajet');
  // Valhalla returns encoded polyline (shape) - need to decode via shape? For MVP, fallback: if no shape decoded, throw to fallback OSRM
  // Valhalla geometry is encoded polyline in trip.legs[0].shape (polyline6)
  if (trip.legs[0].shape) {
    const coords = decodePolyline(trip.legs[0].shape) as LonLat[];
    const distance = (trip.summary?.length || 0) * 1000;
    const duration = trip.summary?.time || 0;
    const steps: RouteStep[] = [];
    for (const leg of trip.legs) for (const m of leg.maneuvers || []) steps.push({ instruction: m.instruction || 'Continuer', distance: (m.length || 0) * 1000, duration: m.time || 0 });
    const entry = { coords, distance, duration, steps };
    cache.set(key, entry);
    return { coordinates: coords, distance, steps, duration };
  }
  throw new Error('Valhalla shape manquante');
}

// Polyline6 decode for Valhalla (precision 6)
function decodePolyline(str: string, precision = 6): number[][] {
  let index = 0, lat = 0, lng = 0;
  const coordinates: number[][] = [];
  const factor = Math.pow(10, precision);
  while (index < str.length) {
    let result = 0, shift = 0, b;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1; lat += dlat;
    result = 0; shift = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1; lng += dlng;
    coordinates.push([lng / factor, lat / factor]);
  }
  return coordinates;
}

function estimateLength(coords: LonLat[]): number {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1]; const [lon2, lat2] = coords[i];
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    sum += 2 * R * Math.asin(Math.sqrt(a));
  }
  return sum;
}

export function simplifyCoordinates(coords: LonLat[], maxPoints: number): LonLat[] {
  if (coords.length <= maxPoints) return coords;
  const step = Math.ceil(coords.length / maxPoints);
  const out: LonLat[] = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]);
  if (out[out.length - 1] !== coords[coords.length - 1]) out.push(coords[coords.length - 1]);
  return out;
}

export function coordsToLatLng(coords: LonLat[]): LatLng[] {
  return coords.map(([lon, lat]) => ({ lat, lng: lon }));
}
