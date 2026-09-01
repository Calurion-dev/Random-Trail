import { describe, it, expect } from 'vitest';
import { estimateDuration, computeDifficultyScore, computeGlobalScore, computeAscentDescent } from '../lib/scoring';

describe('scoring', () => {
  it('estimates running duration with ascent', () => {
    const d = estimateDuration(10, 200, 'course', 'trail', 'intermediaire');
    // 10km trail base 8 km/h terrain 1.3 => ~97 + 20 = ~117 approx
    expect(d).toBeGreaterThan(60);
    expect(d).toBeLessThan(200);
  });

  it('estimates cycling duration', () => {
    const d = estimateDuration(30, 400, 'velo', 'route', 'intermediaire');
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(150);
  });

  it('computes difficulty 0-100', () => {
    const s = computeDifficultyScore(20, 500, 'velo', 'route');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it('computes global score with penalties', () => {
    const g = computeGlobalScore({
      targetDistanceM: 20000,
      actualDistanceM: 22000,
      maxDistanceM: 25000,
      maxElevationM: 1000,
      actualAscentM: 800,
      poiCount: 2,
      isLoopClosed: true,
      routingOk: true,
      terrainMatch: false,
    });
    expect(g).toBeGreaterThan(70);
  });

  it('computes ascent with threshold', () => {
    const { ascent, descent } = computeAscentDescent([100, 102, 105, 104, 110, 108]);
    // diffs: +2 ignored (<3), +3 ignored? threshold >3 so +3 not counted -> only +6 counts? let's check expectation: 105->104 diff -1 ignored, 104->110 +6 counted, 110->108 -2 ignored => ascent 6
    expect(ascent).toBe(6);
  });
});
