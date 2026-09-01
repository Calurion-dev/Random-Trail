import type { GeneratedRoute } from '../../types';

export function RouteSummary({ route }: { route: GeneratedRoute | null }) {
  if (!route) return <div style={{ padding: 12, fontSize: '.85rem', color: 'var(--text3)' }}>Aucun parcours généré.</div>;
  const distKm = (route.distanceMeters / 1000).toFixed(2);
  const durMin = Math.round(route.estimatedDurationSeconds / 60);
  const h = Math.floor(durMin / 60);
  const m = durMin % 60;
  const durStr = h ? `${h}h ${m}min` : `${m} min`;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span className="badge">{route.sport} · {route.subtype}</span>
        <span className="badge">{route.routeType}</span>
        <span className="badge">Difficulté {route.difficultyScore}/100</span>
        <span className="badge" style={{ background: route.globalScore > 70 ? '#dcfce7' : route.globalScore > 40 ? '#fef9c3' : '#fee2e2', color: '#334155' }}>Score {route.globalScore}/100</span>
      </div>
      <div className="summary">
        <div className="stat"><div className="stat-value">{distKm}</div><div className="stat-label">km</div></div>
        <div className="stat"><div className="stat-value">{durStr}</div><div className="stat-label">durée est.</div></div>
        <div className="stat"><div className="stat-value">{route.ascentMeters} m</div><div className="stat-label">D+</div></div>
      </div>
      <div className="summary" style={{ marginTop: 8 }}>
        <div className="stat"><div className="stat-value">{route.descentMeters} m</div><div className="stat-label">D-</div></div>
        <div className="stat"><div className="stat-value">{route.minElevation ?? '—'}</div><div className="stat-label">min m</div></div>
        <div className="stat"><div className="stat-value">{route.maxElevation ?? '—'}</div><div className="stat-label">max m</div></div>
      </div>
      {route.pois.length > 0 && (
        <div style={{ marginTop: 10, fontSize: '.8rem' }}>
          <strong>POI à proximité :</strong> {route.pois.slice(0, 6).map((p) => `${p.type}${p.name ? ` (${p.name})` : ''}`).join(', ')}
          {route.pois.length > 6 && ` +${route.pois.length - 6}`}
        </div>
      )}
      {route.steps.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '.8rem', fontWeight: 700, marginBottom: 4 }}>Étapes (OSRM)</div>
          <ol style={{ fontSize: '.8rem', paddingLeft: 16, maxHeight: 120, overflowY: 'auto' }}>
            {route.steps.slice(0, 12).map((s, i) => (
              <li key={i} style={{ marginBottom: 2 }}>{s.instruction} — {(s.distance / 1000).toFixed(2)} km</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
