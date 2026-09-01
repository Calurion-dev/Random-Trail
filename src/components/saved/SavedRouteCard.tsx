import type { SavedRoute } from '../../types';
import { exportGPX, exportKML, exportSVG, downloadFile } from '../../lib/exporters';
import { buildShareUrl } from '../../lib/share';
import { useSavedRoutesStore } from '../../store/savedRoutesStore';
import { useGeneratorStore } from '../../store/generatorStore';

export function SavedRouteCard({ route, onLoad }: { route: SavedRoute; onLoad?: () => void }) {
  const { remove, rename, duplicate } = useSavedRoutesStore();
  const setRoute = useGeneratorStore((s) => s.setRoute);

  const handleExport = (type: 'gpx' | 'kml' | 'svg') => {
    if (type === 'gpx') downloadFile(exportGPX(route), `${route.title}.gpx`, 'application/gpx+xml');
    if (type === 'kml') downloadFile(exportKML(route), `${route.title}.kml`, 'application/vnd.google-earth.kml+xml');
    if (type === 'svg') downloadFile(exportSVG(route), `${route.title}.svg`, 'image/svg+xml');
  };

  const handleShare = async () => {
    const url = buildShareUrl(route);
    window.location.hash = url.split('#')[1];
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      alert('Lien copié !');
    } else {
      prompt('Copiez ce lien', shareUrl);
    }
  };

  return (
    <div className="route-card">
      <h3>{route.title}</h3>
      <div className="meta">
        <span>{(route.distanceMeters / 1000).toFixed(1)} km</span>
        <span>{route.ascentMeters} m D+</span>
        <span>{route.sport}/{route.subtype}</span>
        <span>{new Date(route.createdAt).toLocaleDateString('fr-FR')}</span>
      </div>
      <div className="actions">
        <button className="btn btn-small" onClick={() => { setRoute(route); onLoad?.(); }}>Charger</button>
        <button className="btn btn-secondary btn-small" onClick={() => {
          const v = prompt('Nouveau nom', route.title);
          if (v) rename(route.id, v);
        }}>Renommer</button>
        <button className="btn btn-secondary btn-small" onClick={() => duplicate(route.id)}>Dupliquer</button>
        <button className="btn btn-secondary btn-small" onClick={() => handleExport('gpx')}>GPX</button>
        <button className="btn btn-secondary btn-small" onClick={() => handleExport('kml')}>KML</button>
        <button className="btn btn-secondary btn-small" onClick={() => handleExport('svg')}>SVG</button>
        <button className="btn btn-secondary btn-small" onClick={handleShare}>Partager</button>
        <button className="btn btn-danger btn-small" onClick={() => { if (confirm('Supprimer ce parcours ?')) remove(route.id); }}>Supprimer</button>
      </div>
    </div>
  );
}
