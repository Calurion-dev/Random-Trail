import type { GeneratedRoute } from '../../types';

export function ElevationProfile({ route }: { route: GeneratedRoute | null }) {
  if (!route || !route.elevationProfile.length) return null;
  const prof = route.elevationProfile;
  const width = 340;
  const height = 100;
  const pad = 10;
  const maxEle = Math.max(...prof.map((p) => p.ele));
  const minEle = Math.min(...prof.map((p) => p.ele));
  const maxDist = prof[prof.length - 1].dist || 1;
  const range = maxEle - minEle || 1;

  const points = prof
    .map((p) => {
      const x = pad + (p.dist / maxDist) * (width - pad * 2);
      const y = height - pad - ((p.ele - minEle) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  // area polygon
  const areaPoints = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;

  return (
    <div className="elevation-wrap">
      <h4>Profil altimétrique — {route.ascentMeters} m D+ / {route.descentMeters} m D- ({minEle}–{maxEle} m)</h4>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: 'block' }}>
        <polygon points={areaPoints} fill="rgba(14,165,233,0.15)" stroke="none" />
        <polyline points={points} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--text3)', marginTop: 4 }}>
        <span>0 km</span>
        <span>{(maxDist / 1000).toFixed(1)} km</span>
      </div>
    </div>
  );
}
