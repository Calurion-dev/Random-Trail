import { useEffect } from 'react';
import { useActivityStore } from '../../store/activityStore';
import { useWakeLock } from '../../hooks/useWakeLock';
import { MapView } from '../map/MapView';

export function ActivityView() {
  const { route, currentPos, remainingMeters, remainingAscentM, offRoute, speedKmh, bearing, nextInstruction, watching, updatePosition, setWatching } = useActivityStore();
  const { supported, active, request, release } = useWakeLock();

  useEffect(() => {
    if (!watching) return;
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        updatePosition({ lat: p.coords.latitude, lng: p.coords.longitude }, p.coords.speed);
        if (offRoute && navigator.vibrate) navigator.vibrate(200);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [watching, updatePosition, offRoute]);

  if (!route) return <div style={{ padding: 16, color: 'var(--text3)' }}>Aucun parcours sélectionné. Générez ou chargez un parcours puis lancez l'activité.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <button className="btn" onClick={() => setWatching(!watching)}>{watching ? '⏸ Pause suivi' : '▶ Démarrer suivi GPS'}</button>
        {!supported && <span className="alert alert-warn">Wake Lock non supporté : l'écran peut se verrouiller.</span>}
        {supported && !active && watching && <button className="btn btn-secondary btn-small" onClick={request}>Empêcher veille écran</button>}
        {active && <span className="badge">Écran maintenu allumé</span>}
        {supported && active && <button className="btn btn-ghost btn-small" onClick={release}>Libérer</button>}
      </div>

      {offRoute && <div className="offroute">⚠️ Hors parcours — revenez sur le tracé (&gt;50 m)</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: 12 }}>
        <div className="activity-stat"><div className="val">{(remainingMeters / 1000).toFixed(2)} km</div><div className="lbl">Restant</div></div>
        <div className="activity-stat"><div className="val">{remainingAscentM} m</div><div className="lbl">D+ restant</div></div>
        <div className="activity-stat"><div className="val">{speedKmh !== null ? `${speedKmh.toFixed(1)} km/h` : '—'}</div><div className="lbl">Vitesse</div></div>
      </div>

      <div style={{ padding: '0 12px 12px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border)', display: 'grid', placeItems: 'center', fontSize: '1.5rem', transform: `rotate(${bearing}deg)` }}>
          ↑
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>Cap : {Math.round(bearing)}°</div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)' }}>{nextInstruction || 'Suivez le tracé'}</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 300 }}>
        <MapView route={route} start={null} waypoints={[]} pois={route.pois} currentPos={currentPos ?? undefined} followPos={watching && !!currentPos} />
      </div>
    </div>
  );
}
