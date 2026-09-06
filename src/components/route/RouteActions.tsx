import type { GeneratedRoute } from '../../types';
import { exportGPX, exportKML, exportSVG, exportGeoJSON, downloadFile } from '../../lib/exporters';
import { buildShareUrl } from '../../lib/share';
import { useSavedRoutesStore } from '../../store/savedRoutesStore';
import ShareQR from '../ShareQR';

export function RouteActions({ route, onStartActivity }: { route: GeneratedRoute | null; onStartActivity?: () => void }) {
  const save = useSavedRoutesStore((s) => s.save);

  if (!route) return null;

  const handleSave = async () => {
    await save(route);
    alert('Parcours enregistré !');
  };

  const handleGPX = () => downloadFile(exportGPX(route), `${route.title}.gpx`, 'application/gpx+xml');
  const handleKML = () => downloadFile(exportKML(route), `${route.title}.kml`, 'application/vnd.google-earth.kml+xml');
  const handleSVG = () => downloadFile(exportSVG(route), `${route.title}.svg`, 'image/svg+xml');

  const handleShare = async () => {
    const url = buildShareUrl(route);
    // put hash in current url
    window.location.hash = url.split('#')[1];
    const shareUrl = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: route.title, url: shareUrl }); return; } catch {}
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      alert('Lien copié : ' + shareUrl);
    } else {
      prompt('Copiez ce lien :', shareUrl);
    }
  };

  const handleWatch = async () => {
    const gpx = exportGPX(route);
    if ((navigator as any).canShare && (navigator as any).canShare({ files: [new File([gpx], 'route.gpx', { type: 'application/gpx+xml' })] })) {
      try {
        const file = new File([gpx], `${route.title}.gpx`, { type: 'application/gpx+xml' });
        await (navigator as any).share({ files: [file], title: route.title });
        return;
      } catch {}
    }
    downloadFile(gpx, `${route.title}.gpx`, 'application/gpx+xml');
  };

  const handleGeoJSON = () => downloadFile(exportGeoJSON(route), `${route.title}.geojson`, 'application/geo+json');

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button className="btn" onClick={handleSave}>💾 Enregistrer</button>
        <button className="btn btn-secondary" onClick={handleGPX}>GPX</button>
        <button className="btn btn-secondary" onClick={handleKML}>KML</button>
        <button className="btn btn-secondary" onClick={handleSVG}>SVG</button>
        <button className="btn btn-secondary" onClick={handleGeoJSON}>GeoJSON</button>
        <button className="btn btn-secondary" onClick={handleShare}>🔗 Partager</button>
        <button className="btn btn-secondary" onClick={handleWatch}>⌚ Envoyer vers montre</button>
        {onStartActivity && <button className="btn" style={{ background: '#10b981' }} onClick={onStartActivity}>▶ Lancer l'activité</button>}
      </div>
      <ShareQR route={route} />
    </div>
  );
}
