import type { LonLat } from '../types';

export function parseGeoJSON(text: string): { coordinates: LonLat[]; name?: string } {
  let obj: any;
  try { obj = JSON.parse(text); } catch { throw new Error('Fichier GeoJSON invalide (JSON)'); }
  const name: string | undefined = obj.properties?.name || obj.name || obj.features?.[0]?.properties?.name;
  let coords: any[] | null = null;
  if (obj.type === 'Feature' && obj.geometry?.type === 'LineString') coords = obj.geometry.coordinates;
  else if (obj.type === 'Feature' && obj.geometry?.type === 'MultiLineString') coords = obj.geometry.coordinates.flat();
  else if (obj.type === 'FeatureCollection') {
    for (const f of obj.features || []) {
      if (f.geometry?.type === 'LineString') { coords = f.geometry.coordinates; break; }
      if (f.geometry?.type === 'MultiLineString') { coords = f.geometry.coordinates.flat(); break; }
    }
  } else if (obj.type === 'LineString') coords = obj.coordinates;
  else if (obj.type === 'MultiLineString') coords = obj.coordinates.flat();
  if (!coords || !coords.length) throw new Error('Aucune LineString trouvée dans le GeoJSON');
  const coordinates: LonLat[] = coords.map((c: any) => [parseFloat(c[0]), parseFloat(c[1])] as LonLat).filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));
  if (!coordinates.length) throw new Error('Coordonnées GeoJSON invalides');
  return { coordinates, name };
}

export function parseAny(text: string, filename: string): { coordinates: LonLat[]; name?: string } {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.gpx')) return parseGPX(text);
  if (lower.endsWith('.kml')) return parseKML(text);
  if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
    try { return parseGeoJSON(text); } catch {}
  }
  // auto-detect: try GeoJSON then GPX then KML
  try { if (text.trim().startsWith('{')) return parseGeoJSON(text); } catch {}
  try { return parseGPX(text); } catch {}
  return parseKML(text);
}

export function parseGPX(text: string): { coordinates: LonLat[]; name?: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Fichier GPX invalide');

  const nameEl = doc.querySelector('trk > name, metadata > name');
  const name = nameEl?.textContent?.trim() || undefined;

  const coordinates: LonLat[] = [];
  const trkpts = doc.querySelectorAll('trkpt');
  if (trkpts.length) {
    trkpts.forEach((pt) => {
      const lat = parseFloat(pt.getAttribute('lat') || '');
      const lon = parseFloat(pt.getAttribute('lon') || '');
      if (!isNaN(lat) && !isNaN(lon)) coordinates.push([lon, lat]);
    });
  } else {
    // try wpt / rtept
    const pts = doc.querySelectorAll('wpt, rtept');
    pts.forEach((pt) => {
      const lat = parseFloat(pt.getAttribute('lat') || '');
      const lon = parseFloat(pt.getAttribute('lon') || '');
      if (!isNaN(lat) && !isNaN(lon)) coordinates.push([lon, lat]);
    });
  }
  if (!coordinates.length) throw new Error('Aucune coordonnée trouvée dans le GPX');
  return { coordinates, name };
}

export function parseKML(text: string): { coordinates: LonLat[]; name?: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Fichier KML invalide');

  const nameEl = doc.querySelector('Document > name, Placemark > name');
  const name = nameEl?.textContent?.trim() || undefined;

  const coordinates: LonLat[] = [];
  const coordEls = doc.querySelectorAll('coordinates');
  coordEls.forEach((el) => {
    const txt = el.textContent?.trim() || '';
    const pairs = txt.split(/\s+/);
    for (const pair of pairs) {
      const [lonStr, latStr] = pair.split(',');
      const lon = parseFloat(lonStr);
      const lat = parseFloat(latStr);
      if (!isNaN(lon) && !isNaN(lat)) coordinates.push([lon, lat]);
    }
  });
  if (!coordinates.length) throw new Error('Aucune coordonnée trouvée dans le KML');
  return { coordinates, name };
}
