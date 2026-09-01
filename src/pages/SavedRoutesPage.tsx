import { SavedRoutesList } from '../components/saved/SavedRoutesList';
import { useNavigate } from 'react-router-dom';
import { MapView } from '../components/map/MapView';
import { useGeneratorStore } from '../store/generatorStore';

export function SavedRoutesPage() {
  const navigate = useNavigate();
  const route = useGeneratorStore((s) => s.route);
  return (
    <div className="main">
      <aside className="sidebar">
        <div className="sheet-handle" />
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <h2>Mes parcours enregistrés</h2>
          <p style={{ fontSize: '.85rem', color: 'var(--text3)', marginTop: 4 }}>Stockés localement (IndexedDB). Exportez en GPX pour votre montre.</p>
        </div>
        <SavedRoutesList onLoadRoute={() => navigate('/')} />
      </aside>
      <div className="map-wrap">
        <MapView route={route} start={route ? { lat: route.coordinates[0][1], lng: route.coordinates[0][0] } as any : null} pois={route?.pois} />
      </div>
    </div>
  );
}
