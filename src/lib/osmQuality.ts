// Best-effort quality analysis - fails gracefully
import type { LonLat } from '../types';

export interface QualityInfo {
  roadExposure: number; // 0-1 estimate
  cyclewayRatio: number; // 0-1
  pathRatio: number; // 0-1
}

export async function estimateQuality(_coords: LonLat[]): Promise<QualityInfo | null> {
  // Placeholder: would query Overpass for highway types along route.
  // To avoid heavy calls, return neutral values.
  // Keep graceful degradation - don't block generation.
  return {
    roadExposure: 0.3,
    cyclewayRatio: 0.2,
    pathRatio: 0.2,
  };
}
