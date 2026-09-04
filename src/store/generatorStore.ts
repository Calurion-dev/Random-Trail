import { create } from 'zustand';
import type { GeneratedRoute, GeneratorParams, LonLat } from '../types';
import { DEFAULT_GENERATOR_PARAMS } from '../constants/defaults';
import { fetchRoute, simplifyCoordinates, type RoutingProvider } from '../lib/routing';
import { computeElevationStats } from '../lib/elevation';
import { fetchPoisNearRoute } from '../lib/poi';
import { estimateDuration, computeDifficultyScore, computeGlobalScore, generateCandidateWaypoints } from '../lib/scoring';
import { estimateQuality, qualityToScore } from '../lib/osmQuality';
import { loadPreferences } from '../lib/storage';

interface GeneratorState {
  params: GeneratorParams;
  route: GeneratedRoute | null;
  loading: boolean;
  error: string | null;
  setParams: (p: Partial<GeneratorParams>) => void;
  setStart: (pos: { lat: number; lng: number }, label: string) => void;
  addWaypoint: (pos: { lat: number; lng: number }) => void;
  removeWaypoint: (idx: number) => void;
  updateWaypoint: (idx: number, pos: { lat: number; lng: number }) => void;
  reorderWaypoints: (fromIdx: number, toIdx: number) => void;
  clearWaypoints: () => void;
  generate: () => Promise<void>;
  regenerate: () => Promise<void>;
  setRoute: (r: GeneratedRoute | null) => void;
}

function normalizeTargetDistance(params: GeneratorParams): number {
  if (params.distanceKm && params.distanceKm > 0) return params.distanceKm;
  if (params.durationMinutes && params.durationMinutes > 0) {
    const key = `${params.sport}-${params.subtype}`;
    const speeds: Record<string, number> = {
      'velo-route': 20,
      'velo-vtt': 14,
      'course-route': 9,
      'course-trail': 8,
      'course-montagne': 6,
      'course-campagne': 9,
    };
    const base = speeds[key] ?? 10;
    // difficulty/terrain factor approximate
    const hours = params.durationMinutes / 60;
    const terrainFactor = key.includes('montagne') ? 1.6 : key.includes('trail') ? 1.3 : key.includes('vtt') ? 1.25 : key.includes('campagne') ? 1.15 : 1;
    const diffMult = params.difficulty === 'debutant' ? 0.9 : params.difficulty === 'avance' ? 1.15 : 1;
    const estSpeed = (base * diffMult) / terrainFactor;
    return Math.max(1, Math.round(hours * estSpeed * 10) / 10);
  }
  return 10;
}

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  params: { ...DEFAULT_GENERATOR_PARAMS },
  route: null,
  loading: false,
  error: null,

  setParams: (p) => set((s) => ({ params: { ...s.params, ...p } })),
  setStart: (pos, label) => set((s) => ({ params: { ...s.params, start: pos, startLabel: label } })),
  addWaypoint: (pos) => set((s) => ({ params: { ...s.params, waypoints: [...s.params.waypoints, pos] } })),
  removeWaypoint: (idx) => set((s) => ({ params: { ...s.params, waypoints: s.params.waypoints.filter((_, i) => i !== idx) } })),
  updateWaypoint: (idx, pos) => set((s) => {
    const w = [...s.params.waypoints];
    w[idx] = pos;
    return { params: { ...s.params, waypoints: w } };
  }),
  reorderWaypoints: (fromIdx: number, toIdx: number) => set((s) => {
    const w = [...s.params.waypoints];
    if (fromIdx < 0 || fromIdx >= w.length || toIdx < 0 || toIdx >= w.length) return s;
    const [moved] = w.splice(fromIdx, 1);
    w.splice(toIdx, 0, moved);
    return { params: { ...s.params, waypoints: w } };
  }),
  clearWaypoints: () => set((s) => ({ params: { ...s.params, waypoints: [] } })),
  setRoute: (r) => set({ route: r }),

  regenerate: async () => {
    const { params } = get();
    set({ params: { ...params, seed: Date.now() + Math.floor(Math.random() * 100000) } });
    await get().generate();
  },

  generate: async () => {
    const { params } = get();
    if (!params.start) {
      set({ error: 'Veuillez choisir un point de départ (clic sur carte, recherche ou géolocalisation).' });
      return;
    }
    set({ loading: true, error: null });

    const targetDistanceKm = (() => {
      let d = normalizeTargetDistance(params);
      if (params.maxDistanceKm && d > params.maxDistanceKm) d = params.maxDistanceKm;
      return Math.max(0.5, d);
    })();

    // Génère 4 candidats pour meilleure cohérence (écart distance minimisé)
    const candidateCount = params.manualMode ? 1 : 4;
    const candidates: { score: number; route: GeneratedRoute; distanceError: number }[] = [];

    for (let c = 0; c < candidateCount; c++) {
      try {
        const waypoints = generateCandidateWaypoints(
          params.start!,
          targetDistanceKm,
          params.directionDeg,
          params.routeType,
          params.manualMode ? params.waypoints : [],
          params.seed,
          c,
          { sport: params.sport, subtype: params.subtype, loops: params.loops }
        );

        const prefs = loadPreferences();
        const routingProvider = (prefs.routingProvider || 'osrm') as RoutingProvider;
        const { coordinates, distance, steps } = await fetchRoute(params.sport, params.subtype, waypoints, params.start!, params.routeType, routingProvider);

        // elevation
        const { ascent, descent, min, max, profile } = await computeElevationStats(coordinates);
        const distanceKm = distance / 1000;
        const durationMin = estimateDuration(distanceKm, ascent, params.sport, params.subtype, params.difficulty);
        const difficultyScore = computeDifficultyScore(distanceKm, ascent, params.sport, params.subtype);

        // POIs best-effort
        let pois: any[] = [];
        if (params.poiPrefs.include) {
          try {
            pois = await fetchPoisNearRoute(coordinates, params.poiPrefs.types, 12);
          } catch {}
        }

        const isLoopClosed = params.routeType === 'boucle' || params.routeType === 'aller-retour';
        const maxDistM = params.maxDistanceKm ? params.maxDistanceKm * 1000 : null;
        const maxEleM = params.maxElevation;

        // Qualité OSM best-effort
        let qualityScore = 0;
        let qualityInfo: any = null;
        try {
          qualityInfo = await estimateQuality(coordinates);
          qualityScore = qualityToScore(qualityInfo, params.sport, params.subtype);
        } catch {}

        const globalScore = computeGlobalScore({
          targetDistanceM: targetDistanceKm * 1000,
          actualDistanceM: distance,
          maxDistanceM: maxDistM,
          maxElevationM: maxEleM,
          actualAscentM: ascent,
          poiCount: pois.length,
          isLoopClosed,
          routingOk: true,
          terrainMatch: qualityScore > 0,
        }) + qualityScore;

        // Hard constraints filtering
        if (maxDistM && distance > maxDistM * 1.15) {
          // penalize heavily but keep candidate for scoring
        }
        if (maxEleM !== null && maxEleM !== undefined && ascent > maxEleM * 1.3) {
          // skip extreme violation for best candidate selection, but still allow if no alternative
          if (candidates.length > 0) continue;
        }

        const simplified = simplifyCoordinates(coordinates, 400);

        // Cohérence distance + direction
        const distanceError = Math.abs(distance - targetDistanceKm * 1000) / (targetDistanceKm * 1000);
        let coherenceBonus = distanceError < 0.15 ? 5 : distanceError > 0.3 ? -10 : 0;
        // pénalité direction : écart entre cap demandé et barycentre des waypoints
        if (waypoints.length) {
          const avgLat = waypoints.reduce((s, p) => s + p.lat, 0) / waypoints.length;
          const avgLng = waypoints.reduce((s, p) => s + p.lng, 0) / waypoints.length;
          const br = (Math.atan2(avgLng - params.start!.lng, avgLat - params.start!.lat) * 180) / Math.PI;
          const norm = (b: number) => ((b % 360) + 360) % 360;
          let diff = Math.abs(norm(br) - norm(params.directionDeg));
          diff = Math.min(diff, 360 - diff);
          if (diff > 60) coherenceBonus -= 12;
          else if (diff > 35) coherenceBonus -= 6;
          else if (diff < 15) coherenceBonus += 2;
        }
        // malus contraintes dures
        if (maxDistM && distance > maxDistM) coherenceBonus -= 8;
        if (maxEleM !== null && maxEleM !== undefined && ascent > maxEleM) coherenceBonus -= 8;
        // Appliquer le bonus dans le score final côté route
        const route: GeneratedRoute = {
          id: `gen-${Date.now()}-${c}`,
          title: `Parcours ${params.sport === 'velo' ? 'Vélo' : 'Course'} ${distanceKm.toFixed(1)} km`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sport: params.sport,
          subtype: params.subtype,
          routeType: params.routeType,
          source: params.manualMode ? 'manual' : 'automatic',
          params: { ...params },
          coordinates,
          simplifiedCoordinates: simplified,
          distanceMeters: distance,
          ascentMeters: ascent,
          descentMeters: descent,
          minElevation: min,
          maxElevation: max,
          estimatedDurationSeconds: durationMin * 60,
          difficultyScore,
          globalScore: globalScore + coherenceBonus,
          steps,
          pois,
          elevationProfile: profile,
        };

        // Filtre doux : si erreur >40% on écarte ce candidat sauf si c'est le seul
        if (distanceError > 0.4 && c < candidateCount - 1) {
          // garde seulement si pas d'alternative meilleure
          if (candidates.length > 0) continue;
        }
        candidates.push({ score: globalScore + coherenceBonus, route, distanceError });
      } catch (e: any) {
        // continue to next candidate
        if (c === 0 && candidateCount === 1) {
          set({ loading: false, error: e.message || 'Erreur lors de la génération' });
          return;
        }
      }
    }

    if (!candidates.length) {
      set({ loading: false, error: 'Impossible de générer un parcours. Réessayez ou modifiez les contraintes.' });
      return;
    }
    candidates.sort((a, b) => b.score - a.score);
    set({ route: candidates[0].route, loading: false, error: null });
  },
}));
