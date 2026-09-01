import { create } from 'zustand';
import type { GeneratedRoute, LatLng } from '../types';
import { remainingDistance, remainingAscent, bearingToNext, isOffRoute, frenchInstruction } from '../lib/activity';

interface ActivityState {
  route: GeneratedRoute | null;
  currentPos: LatLng | null;
  speedKmh: number | null;
  remainingMeters: number;
  remainingAscentM: number;
  offRoute: boolean;
  bearing: number;
  nextInstruction: string | null;
  watching: boolean;
  setRoute: (r: GeneratedRoute | null) => void;
  updatePosition: (pos: LatLng, speedMps?: number | null) => void;
  setWatching: (w: boolean) => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  route: null,
  currentPos: null,
  speedKmh: null,
  remainingMeters: 0,
  remainingAscentM: 0,
  offRoute: false,
  bearing: 0,
  nextInstruction: null,
  watching: false,

  setRoute: (r) => set({ route: r }),
  setWatching: (w) => set({ watching: w }),
  updatePosition: (pos, speedMps) => {
    const { route } = get();
    if (!route) {
      set({ currentPos: pos, speedKmh: speedMps != null ? speedMps * 3.6 : null });
      return;
    }
    const coords = route.simplifiedCoordinates.length ? route.simplifiedCoordinates : route.coordinates;
    const rem = remainingDistance(pos, coords);
    const remAsc = remainingAscent(pos, coords, route.elevationProfile);
    const br = bearingToNext(pos, coords);
    const off = isOffRoute(pos, coords, 50);
    // next instruction: take first step if available
    let instr: string | null = null;
    if (route.steps.length) {
      const s = route.steps[0];
      instr = frenchInstruction(s.maneuver, s.modifier, s.instruction);
    }
    const speedKmh = speedMps != null ? speedMps * 3.6 : null;
    set({
      currentPos: pos,
      speedKmh,
      remainingMeters: rem,
      remainingAscentM: remAsc,
      offRoute: off,
      bearing: br,
      nextInstruction: instr,
    });
  },
}));
