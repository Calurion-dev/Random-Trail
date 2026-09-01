import { useSettingsStore } from '../../store/settingsStore';
import { DEFAULT_SPEEDS } from '../../constants/sports';

export function SettingsForm() {
  const s = useSettingsStore();

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <h2 style={{ marginBottom: 12 }}>Réglages</h2>

      <div className="form-section" style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12 }}>
        <div className="form-title">Position de départ par défaut</div>
        <div className="field">
          <label className="label">Label</label>
          <input className="input" value={s.defaultStartLabel} onChange={(e) => s.set({ defaultStartLabel: e.target.value })} placeholder="Ex: Maison" />
        </div>
        <div className="row">
          <div className="field">
            <label className="label">Latitude</label>
            <input className="input" type="number" value={s.defaultStart?.lat ?? ''} onChange={(e) => {
              const lat = parseFloat(e.target.value);
              if (!isNaN(lat)) s.set({ defaultStart: { lat, lng: s.defaultStart?.lng ?? 0 } });
            }} />
          </div>
          <div className="field">
            <label className="label">Longitude</label>
            <input className="input" type="number" value={s.defaultStart?.lng ?? ''} onChange={(e) => {
              const lng = parseFloat(e.target.value);
              if (!isNaN(lng)) s.set({ defaultStart: { lat: s.defaultStart?.lat ?? 0, lng } });
            }} />
          </div>
        </div>
        <div style={{ fontSize: '.8rem', color: 'var(--text3)' }}>Utilisé comme point de départ suggéré au chargement.</div>
      </div>

      <div className="form-section" style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12 }}>
        <div className="form-title">Vitesses par défaut (km/h)</div>
        {Object.entries(DEFAULT_SPEEDS).map(([k, def]) => (
          <div key={k} className="field">
            <label className="label">{k}</label>
            <input className="input" type="number" value={s.defaultSpeeds[k] ?? def} onChange={(e) => s.set({ defaultSpeeds: { ...s.defaultSpeeds, [k]: parseFloat(e.target.value) || def } })} />
          </div>
        ))}
      </div>

      <div className="form-section" style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12 }}>
        <div className="form-title">Contraintes globales</div>
        <div className="field">
          <label className="label">Distance max (km)</label>
          <input className="input" type="number" value={s.maxDistanceKm} onChange={(e) => s.set({ maxDistanceKm: parseFloat(e.target.value) || 50 })} />
        </div>
        <div className="field">
          <label className="label">Dénivelé max (m) — vide = illimité</label>
          <input className="input" type="number" value={s.maxElevationM ?? ''} placeholder="illimité" onChange={(e) => s.set({ maxElevationM: e.target.value ? parseInt(e.target.value) : null })} />
        </div>
      </div>

      <div className="form-section" style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12 }}>
        <div className="form-title">Intégrations (à venir)</div>
        <div className="alert alert-info" style={{ marginBottom: 8 }}>
          Strava et Google Health ne sont pas configurés dans cette version cliente. Exportez le GPX et importez-le manuellement.
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--text2)' }}>
          Voir <code>src/lib/integrations/strava.ts</code> et <code>googleHealth.ts</code> pour l’implémentation future (OAuth + proxy backend nécessaire).
        </div>
      </div>

      <div className="form-section" style={{ border: '1px solid var(--border)', borderRadius: 12 }}>
        <div className="form-title">Attribution & mentions légales</div>
        <ul style={{ fontSize: '.85rem', color: 'var(--text2)', paddingLeft: 16 }}>
          <li>Tiles © OpenStreetMap contributeurs</li>
          <li>Routage OSRM — démo publique (pas de SLA)</li>
          <li>Géocodage Nominatim — respectez la politique d’usage (pas d’abus, cache/delai)</li>
          <li>POI Overpass API</li>
          <li>Altitude Open-Meteo</li>
        </ul>
        <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginTop: 8 }}>
          Les données de routage OSRM public sont imparfaites pour VTT/trail. Vérifiez toujours le tracé avant de partir.
        </div>
      </div>
    </div>
  );
}
