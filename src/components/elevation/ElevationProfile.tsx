import type { GeneratedRoute } from '../../types';

export function ElevationProfile({ route }: { route: GeneratedRoute | null }) {
  if (!route || !route.elevationProfile?.length) return null;
  const prof = route.elevationProfile;
  if (prof.length < 2) return null;

  const eles = prof.map((p) => p.ele);
  const allZero = eles.every((v) => v === 0);
  if (allZero) {
    return (
      <div className="elevation-wrap">
        <h4>Profil altimétrique — {route.ascentMeters} m D+ / {route.descentMeters} m D-</h4>
        <div style={{ padding: 12, fontSize: '.8rem', color: 'var(--text3)', textAlign: 'center' }}>
          Profil indisponible — service d'altitude temporairement indisponible. Le tracé reste utilisable.
        </div>
      </div>
    );
  }

  const width = 340;
  const height = 100;
  const pad = 10;
  const maxEle = Math.max(...eles);
  const minEle = Math.min(...eles);
  const maxDist = prof[prof.length - 1].dist || 1;
  const range = maxEle - minEle || 1;

  const points = prof
    .map((p) => {
      const x = pad + (p.dist / maxDist) * (width - pad * 2);
      const y = height - pad - ((p.ele - minEle) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;

  return (
    <div className="elevation-wrap">
      <h4>
        Profil altimétrique — {route.ascentMeters} m D+ / {route.descentMeters} m D- ({Math.round(minEle)}–{Math.round(maxEle)} m)
      </h4>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: 'block' }}>
        <polygon points={areaPoints} fill="rgba(14,165,233,0.15)" stroke="none" />
        <polyline points={points} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* axes */}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--border2)" strokeWidth={0.5} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--text3)', marginTop: 4 }}>
        <span>0 km</span>
        <span>{(maxDist / 1000).toFixed(1)} km</span>
        <span>{Math.round(maxEle)} m</span>
      </div>
    </div>
  );
}
