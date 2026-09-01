import { useState, useEffect } from 'react';
import { useGeneratorStore } from '../../store/generatorStore';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useDebounce } from '../../hooks/useDebounce';
import { searchAddress, reverseGeocode } from '../../lib/geocoding';
import { SPORTS, SUBTYPES_VELO, SUBTYPES_COURSE, ROUTE_TYPES, DIFFICULTIES, DIRECTIONS } from '../../constants/sports';
import type { GeocodingResult } from '../../types';

export function GeneratorForm() {
  const { params, setParams, setStart, addWaypoint, clearWaypoints } = useGeneratorStore();
  const { pos, getOnce } = useGeolocation();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debouncedQ = useDebounce(q, 500);

  useEffect(() => {
    if (!debouncedQ) { setResults([]); return; }
    setSearching(true);
    searchAddress(debouncedQ).then((r) => { setResults(r); setSearching(false); });
  }, [debouncedQ]);

  const handleUseGeoloc = () => {
    getOnce();
  };

  useEffect(() => {
    if (pos) {
      reverseGeocode(pos.lat, pos.lng).then((label) => {
        setStart(pos, label || `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
      });
    }
  }, [pos, setStart]);

  const subtypes = params.sport === 'velo' ? SUBTYPES_VELO : SUBTYPES_COURSE;

  return (
    <div>
      {/* Sport */}
      <div className="form-section">
        <div className="form-title">Sport</div>
        <div className="row">
          {SPORTS.map((s) => (
            <button
              key={s.value}
              className={params.sport === s.value ? 'btn' : 'btn btn-secondary'}
              onClick={() => {
                const sub = s.value === 'velo' ? 'route' : 'route';
                setParams({ sport: s.value, subtype: sub as any });
              }}
              style={{ flex: 1 }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <label className="label">Sous-type</label>
          <select
            className="select"
            value={params.subtype}
            onChange={(e) => setParams({ subtype: e.target.value as any })}
          >
            {subtypes.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Départ */}
      <div className="form-section">
        <div className="form-title">Point de départ</div>
        <div className="field">
          <div className="row">
            <button className="btn btn-secondary btn-small" onClick={handleUseGeoloc}>📍 Ma position</button>
            <button className="btn btn-ghost btn-small" onClick={() => { setParams({ start: null, startLabel: '' }); setQ(''); }}>Effacer</button>
          </div>
        </div>
        <div className="field">
          <label className="label">Rechercher une adresse</label>
          <input
            className="input"
            placeholder="Ex: 10 rue de Rivoli, Paris"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {searching && <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginTop: 4 }}>Recherche...</div>}
          {results.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 6, overflow: 'hidden' }}>
              {results.map((r, i) => (
                <div
                  key={i}
                  onClick={() => { setStart({ lat: r.lat, lng: r.lng }, r.label); setResults([]); setQ(r.label); }}
                  style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '.85rem' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize: '.8rem', color: params.start ? 'var(--success)' : 'var(--text3)', background: 'var(--bg2)', padding: '8px 10px', borderRadius: 8 }}>
          {params.start ? `✓ ${params.startLabel || `${params.start.lat.toFixed(5)}, ${params.start.lng.toFixed(5)}`}` : 'Cliquez sur la carte pour choisir le départ'}
        </div>
        {params.waypoints.length > 0 && (
          <div style={{ marginTop: 8, fontSize: '.8rem' }}>
            {params.waypoints.length} étape(s) manuelle(s) <button className="btn btn-ghost btn-small" onClick={clearWaypoints}>Effacer étapes</button>
          </div>
        )}
      </div>

      {/* Type & direction */}
      <div className="form-section">
        <div className="form-title">Parcours</div>
        <div className="field">
          <label className="label">Type de parcours</label>
          <select className="select" value={params.routeType} onChange={(e) => setParams({ routeType: e.target.value as any })}>
            {ROUTE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="row">
          <div className="field">
            <label className="label">Distance (km)</label>
            <input className="input" type="number" min={0.5} step={0.5} value={params.distanceKm ?? ''} onChange={(e) => setParams({ distanceKm: e.target.value ? parseFloat(e.target.value) : null })} placeholder="ex: 20" />
          </div>
          <div className="field">
            <label className="label">Durée (min)</label>
            <input className="input" type="number" min={5} step={5} value={params.durationMinutes ?? ''} onChange={(e) => setParams({ durationMinutes: e.target.value ? parseInt(e.target.value) : null })} placeholder="ex: 90" />
          </div>
        </div>
        {params.routeType === 'boucle' && (
          <div className="field">
            <label className="label">Nombre de boucles</label>
            <input className="input" type="number" min={1} max={5} value={params.loops} onChange={(e) => setParams({ loops: parseInt(e.target.value) || 1 })} />
          </div>
        )}
        <div className="field">
          <label className="label">Direction</label>
          <select
            className="select"
            value={params.directionDeg}
            onChange={(e) => {
              const deg = parseInt(e.target.value);
              const lab = DIRECTIONS.find((d) => d.deg === deg)?.code || 'custom';
              setParams({ directionDeg: deg, directionLabel: lab as any });
            }}
          >
            {DIRECTIONS.map((d) => <option key={d.deg} value={d.deg}>{d.label} ({d.deg}°)</option>)}
          </select>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={0} max={359} value={params.directionDeg} onChange={(e) => setParams({ directionDeg: parseInt(e.target.value), directionLabel: 'custom' })} style={{ flex: 1 }} />
            <span style={{ fontSize: '.8rem', minWidth: 40 }}>{params.directionDeg}°</span>
          </div>
        </div>
        <div className="field">
          <label className="label">Difficulté</label>
          <select className="select" value={params.difficulty} onChange={(e) => setParams({ difficulty: e.target.value as any })}>
            {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="row">
          <div className="field">
            <label className="label">Dénivelé max (m)</label>
            <input className="input" type="number" placeholder="optionnel" value={params.maxElevation ?? ''} onChange={(e) => setParams({ maxElevation: e.target.value ? parseInt(e.target.value) : null })} />
          </div>
          <div className="field">
            <label className="label">Distance max (km)</label>
            <input className="input" type="number" value={params.maxDistanceKm ?? ''} onChange={(e) => setParams({ maxDistanceKm: e.target.value ? parseFloat(e.target.value) : null })} />
          </div>
        </div>
      </div>

      {/* Terrain & POI */}
      <div className="form-section">
        <div className="form-title">Préférences terrain</div>
        {[
          { k: 'pisteCyclable', label: 'Privilégier les pistes cyclables' },
          { k: 'sentiers', label: 'Privilégier les sentiers' },
          { k: 'eviterGrandesRoutes', label: 'Éviter les grandes routes' },
          { k: 'eviterChemins', label: 'Éviter les chemins' },
        ].map((t) => (
          <div key={t.k} className="toggle-row">
            <span>{t.label}</span>
            <div
              className={`switch ${(params.terrainPrefs as any)[t.k] ? 'on' : ''}`}
              onClick={() => setParams({ terrainPrefs: { ...params.terrainPrefs, [t.k]: !(params.terrainPrefs as any)[t.k] } })}
            />
          </div>
        ))}
        <div className="toggle-row">
          <span>Inclure points d'intérêt</span>
          <div className={`switch ${params.poiPrefs.include ? 'on' : ''}`} onClick={() => setParams({ poiPrefs: { ...params.poiPrefs, include: !params.poiPrefs.include } })} />
        </div>
        {params.poiPrefs.include && (
          <div style={{ fontSize: '.8rem', color: 'var(--text2)', marginTop: 6 }}>
            Eau potable, bancs, abris, toilettes, points de vue seront recherchés près du tracé (Overpass).
          </div>
        )}
      </div>

      {/* Mode manuel */}
      <div className="form-section">
        <div className="form-title">Mode manuel</div>
        <div className="toggle-row">
          <span>Édition manuelle des étapes</span>
          <div className={`switch ${params.manualMode ? 'on' : ''}`} onClick={() => setParams({ manualMode: !params.manualMode })} />
        </div>
        <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginTop: 6 }}>
          {params.manualMode ? 'Cliquez sur la carte pour ajouter des étapes. Glissez-les pour déplacer, popup pour supprimer.' : 'Désactivé : génération automatique autour du départ.'}
        </div>
      </div>
    </div>
  );
}
