import { useEffect } from 'react';
import { GeneratorForm } from '../components/form/GeneratorForm';
import { MapView } from '../components/map/MapView';
import { ElevationProfile } from '../components/elevation/ElevationProfile';
import { RouteSummary } from '../components/route/RouteSummary';
import { RouteActions } from '../components/route/RouteActions';
import { useGeneratorStore } from '../store/generatorStore';
import { useSettingsStore } from '../store/settingsStore';
import { useActivityStore } from '../store/activityStore';
import { reverseGeocode } from '../lib/geocoding';
import { useNavigate } from 'react-router-dom';
import { decodeRouteFromHash } from '../lib/share';
import { parseGPX, parseKML } from '../lib/importers';
import { computeElevationStats } from '../lib/elevation';
import { estimateDuration, computeDifficultyScore } from '../lib/scoring';
import type { GeneratedRoute } from '../types';

export function GeneratorPage() {
  const { params, route, loading, error, setStart, addWaypoint, generate, regenerate, setRoute, setParams } = useGeneratorStore();
  const settings = useSettingsStore();
  const setActivityRoute = useActivityStore((s) => s.setRoute);
  const navigate = useNavigate();

  // Load shared route from hash on mount
  useEffect(() => {
    if (window.location.hash.includes('share=')) {
      const decoded = decodeRouteFromHash(window.location.hash);
      if (decoded?.coordinates) {
        const r: GeneratedRoute = {
          id: `shared-${Date.now()}`,
          title: (decoded.title as string) || 'Parcours partagé',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sport: (decoded.sport as any) || 'velo',
          subtype: (decoded.subtype as any) || 'route',
          routeType: 'boucle',
          source: 'shared',
          params: (decoded.params as any) || params,
          coordinates: decoded.coordinates as any,
          simplifiedCoordinates: decoded.coordinates as any,
          distanceMeters: (decoded.distanceMeters as number) || 0,
          ascentMeters: (decoded.ascentMeters as number) || 0,
          descentMeters: 0,
          minElevation: null,
          maxElevation: null,
          estimatedDurationSeconds: 0,
          difficultyScore: 0,
          globalScore: 0,
          steps: [],
          pois: [],
          elevationProfile: [],
        };
        setRoute(r);
      }
    }
    // Load default start from settings if no start
    if (!params.start && settings.defaultStart) {
      setStart(settings.defaultStart, settings.defaultStartLabel || `${settings.defaultStart.lat.toFixed(4)}, ${settings.defaultStart.lng.toFixed(4)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapClick = async (ll: { lat: number; lng: number }) => {
    if (!params.start) {
      const label = await reverseGeocode(ll.lat, ll.lng);
      setStart(ll, label || `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`);
    } else if (params.manualMode) {
      addWaypoint(ll);
    } else {
      // In auto mode, clicking map sets start
      const label = await reverseGeocode(ll.lat, ll.lng);
      setStart(ll, label || `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      let parsed: { coordinates: any; name?: string } | null = null;
      if (file.name.toLowerCase().endsWith('.gpx')) parsed = parseGPX(text);
      else if (file.name.toLowerCase().endsWith('.kml')) parsed = parseKML(text);
      else throw new Error('Format non supporté (GPX/KML uniquement)');

      const coords = parsed.coordinates;
      const { ascent, descent, min, max, profile } = await computeElevationStats(coords);
      // distance approx via turf? quick haversine sum
      let dist = 0;
      for (let i = 1; i < coords.length; i++) {
        const [lon1, lat1] = coords[i - 1];
        const [lon2, lat2] = coords[i];
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        dist += 2 * R * Math.asin(Math.sqrt(a));
      }
      const distKm = dist / 1000;
      const dur = estimateDuration(distKm, ascent, params.sport, params.subtype, params.difficulty);
      const diff = computeDifficultyScore(distKm, ascent, params.sport, params.subtype);
      const r: GeneratedRoute = {
        id: `import-${Date.now()}`,
        title: parsed.name || file.name.replace(/\.(gpx|kml)$/i, ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sport: params.sport,
        subtype: params.subtype,
        routeType: 'multi-points',
        source: 'imported',
        params,
        coordinates: coords,
        simplifiedCoordinates: coords,
        distanceMeters: dist,
        ascentMeters: ascent,
        descentMeters: descent,
        minElevation: min,
        maxElevation: max,
        estimatedDurationSeconds: dur * 60,
        difficultyScore: diff,
        globalScore: 80,
        steps: [],
        pois: [],
        elevationProfile: profile,
      };
      setRoute(r);
    } catch (err: any) {
      alert(err.message || 'Échec import');
    } finally {
      e.target.value = '';
    }
  };

  const handleStartActivity = () => {
    if (!route) return;
    setActivityRoute(route);
    navigate('/activity');
  };

  return (
    <div className="main">
      <aside className="sidebar">
        <div className="sheet-handle" />
        <div style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
          <button className="btn" onClick={generate} disabled={loading || !params.start}>
            {loading ? 'Génération...' : 'Générer un parcours'}
          </button>
          <button className="btn btn-secondary" onClick={regenerate} disabled={loading || !route}>
            Régénérer
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            Importer
            <input type="file" accept=".gpx,.kml" style={{ display: 'none' }} onChange={handleImport} />
          </label>
        </div>
        {error && <div className="alert alert-error" style={{ margin: 12 }}>{error}</div>}
        <GeneratorForm />
        <RouteSummary route={route} />
        <ElevationProfile route={route} />
        <RouteActions route={route} onStartActivity={handleStartActivity} />
      </aside>
      <div className="map-wrap">
        <MapView
          route={route}
          start={params.start}
          waypoints={params.waypoints}
          pois={route?.pois}
          onMapClick={handleMapClick}
          onStartDrag={(ll) => setStart(ll, `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`)}
          onWaypointDrag={(idx, ll) => {
            const w = [...params.waypoints];
            w[idx] = ll;
            setParams({ waypoints: w });
          }}
          onWaypointRemove={(idx) => setParams({ waypoints: params.waypoints.filter((_, i) => i !== idx) })}
        />
      </div>
    </div>
  );
}
