import type { GeneratedRoute, LonLat } from '../types';

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}

export function exportGPX(route: GeneratedRoute): string {
  const name = escapeXml(route.title);
  const coords = route.coordinates;
  const time = new Date().toISOString();
  const trkpts = coords
    .map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RandomParcours" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${name}</name><time>${time}</time></metadata>
  <trk><name>${name}</name><type>${route.sport}-${route.subtype}</type><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>`;
}

export function exportKML(route: GeneratedRoute): string {
  const name = escapeXml(route.title);
  const coords = route.coordinates.map(([lon, lat]) => `${lon},${lat},0`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document><name>${name}</name>
    <Placemark><name>${name}</name>
      <LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString>
    </Placemark>
  </Document>
</kml>`;
}

export function exportSVG(route: GeneratedRoute, width = 800, height = 400): string {
  const coords = route.coordinates;
  if (!coords.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`;

  // Normalize to viewBox
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const padX = (maxLon - minLon) * 0.05 || 0.001;
  const padY = (maxLat - minLat) * 0.05 || 0.001;
  minLon -= padX; maxLon += padX; minLat -= padY; maxLat += padY;
  const scaleX = width / (maxLon - minLon);
  const scaleY = height / (maxLat - minLat);
  const points = coords
    .map(([lon, lat]) => {
      const x = (lon - minLon) * scaleX;
      const y = height - (lat - minLat) * scaleY;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Elevation SVG variant if profile exists - simple polyline
  const hasProfile = route.elevationProfile.length > 1;
  let eleSvg = '';
  if (hasProfile) {
    const prof = route.elevationProfile;
    const maxEle = Math.max(...prof.map((p) => p.ele));
    const minEle = Math.min(...prof.map((p) => p.ele));
    const range = maxEle - minEle || 1;
    const maxDist = prof[prof.length - 1].dist || 1;
    const ePoints = prof
      .map((p) => {
        const x = (p.dist / maxDist) * width;
        const y = height - 40 - ((p.ele - minEle) / range) * (height - 80);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    eleSvg = `<polyline points="${ePoints}" fill="none" stroke="#0ea5e9" stroke-width="2" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <polyline points="${points}" fill="none" stroke="#f97316" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  ${eleSvg}
  <text x="8" y="16" font-family="sans-serif" font-size="12" fill="#475569">${escapeXml(route.title)} — ${ (route.distanceMeters/1000).toFixed(1)} km</text>
</svg>`;
}

export function exportGeoJSON(route: GeneratedRoute): string {
  const geojson = {
    type: 'Feature' as const,
    properties: {
      name: route.title,
      sport: route.sport,
      subtype: route.subtype,
      distance: route.distanceMeters,
      ascent: route.ascentMeters,
    },
    geometry: {
      type: 'LineString' as const,
      coordinates: route.coordinates,
    },
  };
  return JSON.stringify(geojson, null, 2);
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
