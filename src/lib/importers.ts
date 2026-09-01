import type { LonLat } from '../types';

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
