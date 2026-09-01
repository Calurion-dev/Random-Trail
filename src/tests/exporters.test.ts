import { describe, it, expect } from 'vitest';
import { exportGPX, exportKML, exportSVG } from '../lib/exporters';
import type { GeneratedRoute } from '../types';

function mockRoute(): GeneratedRoute {
  return {
    id: 'test',
    title: 'Test Parcours',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sport: 'velo',
    subtype: 'route',
    routeType: 'boucle',
    source: 'automatic',
    params: {} as any,
    coordinates: [[1.0, 46.0], [1.1, 46.1], [1.0, 46.0]],
    simplifiedCoordinates: [[1.0, 46.0], [1.1, 46.1]],
    distanceMeters: 15000,
    ascentMeters: 300,
    descentMeters: 280,
    minElevation: 100,
    maxElevation: 250,
    estimatedDurationSeconds: 3600,
    difficultyScore: 45,
    globalScore: 85,
    steps: [],
    pois: [],
    elevationProfile: [{ dist: 0, ele: 100 }, { dist: 7500, ele: 250 }, { dist: 15000, ele: 110 }],
  };
}

describe('exporters', () => {
  it('exports GPX with trkpt', () => {
    const gpx = exportGPX(mockRoute());
    expect(gpx).toContain('<gpx');
    expect(gpx).toContain('<trkpt');
    expect(gpx).toContain('Test Parcours');
  });

  it('exports KML with LineString', () => {
    const kml = exportKML(mockRoute());
    expect(kml).toContain('<kml');
    expect(kml).toContain('<LineString>');
    expect(kml).toContain('1,46,0');
  });

  it('exports SVG with polyline', () => {
    const svg = exportSVG(mockRoute());
    expect(svg).toContain('<svg');
    expect(svg).toContain('<polyline');
  });
});
