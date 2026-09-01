import { API } from '../constants/api';
import type { LatLng, LonLat, RouteStep } from '../types';

const cache = new Map<string, { coords: LonLat[]; distance: number; duration: number; steps: RouteStep[] }>();
const lastCall = { time: 0 };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildCacheKey(profile: string, coords: LonLat[]): string {
  return `${profile}:${coords.map((c) => c.join(',')).join(';')}`;
}

function mapProfile(sport: string, subtype: string): string {
  // OSRM demo supports car, bike, foot. Use bike for velo, foot for running.
  if (sport === 'velo') return 'bike';
  return 'foot';
}

export async function fetchRoute(
  sport: string,
  subtype: string,
  waypoints: LatLng[],
  start: LatLng,
  routeType: string
): Promise<{ coordinates: LonLat[]; distance: number; steps: RouteStep[]; duration: number }> {
  const profile = mapProfile(sport, subtype);

  // Build ordered coordinates for OSRM: start -> waypoints -> (return to start if loop)
  const lonLatPoints: LonLat[] = [];

  lonLatPoints.push([start.lng, start.lat]);
  for (const w of waypoints) lonLatPoints.push([w.lng, w.lat]);

  if (routeType === 'boucle' || routeType === 'aller-retour') {
    // close loop
    lonLatPoints.push([start.lng, start.lat]);
  }
  // For a-b, multi-points, etapes: last waypoint is end, no return

  // If only start + return (no waypoints), need at least 2 points: will use generated waypoints so OK
  // Remove duplicate consecutive
  const filtered: LonLat[] = [];
  for (const p of lonLatPoints) {
    if (!filtered.length || filtered[filtered.length - 1][0] !== p[0] || filtered[filtered.length - 1][1] !== p[1]) {
      filtered.push(p);
    }
  }
  if (filtered.length < 2) throw new Error('Pas assez de points pour calculer un itinéraire');

  const key = buildCacheKey(profile, filtered);
  if (cache.has(key)) {
    const c = cache.get(key)!;
    return { coordinates: c.coords, distance: c.distance, steps: c.steps, duration: c.duration };
  }

  // Rate limiting: min 300ms between calls
  const now = Date.now();
  const elapsed = now - lastCall.time;
  if (elapsed < 300) await sleep(300 - elapsed);
  lastCall.time = Date.now();

  const coordsStr = filtered.map((c) => `${c[0]},${c[1]}`).join(';');
  const url = `${API.OSRM_BASE}/${profile}/${coordsStr}?overview=full&geometries=geojson&steps=true`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new Error('Service de routage indisponible (réseau). Réessayez.');
  }
  if (res.status === 429) throw new Error('Trop de requêtes vers le service de routage, patientez quelques secondes.');
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Échec du routage OSRM (${res.status}) ${txt.slice(0, 100)}`);
  }
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error(`Routage impossible: ${data.message || data.code || 'erreur inconnue'}`);
  }
  const route = data.routes[0];
  const geometry = route.geometry; // GeoJSON
  const coords: LonLat[] = geometry.coordinates as LonLat[];
  const distance: number = route.distance; // meters
  const duration: number = route.duration; // seconds

  const steps: RouteStep[] = [];
  if (route.legs) {
    for (const leg of route.legs) {
      if (leg.steps) {
        for (const s of leg.steps) {
          const man = s.maneuver || {};
          steps.push({
            instruction: s.maneuver?.type ? `${s.maneuver.type} ${s.maneuver.modifier || ''}`.trim() : s.name || 'Continuer',
            distance: s.distance || 0,
            duration: s.duration || 0,
            maneuver: man.type,
            modifier: man.modifier,
          });
        }
      }
    }
  }

  cache.set(key, { coords, distance, duration, steps });
  // limit cache size
  if (cache.size > 100) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }

  return { coordinates: coords, distance, steps, duration };
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
