import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { API } from '../../constants/api';
import type { GeneratedRoute, LatLng, Poi } from '../../types';

interface Props {
  center?: LatLng;
  zoom?: number;
  route?: GeneratedRoute | null;
  start?: LatLng | null;
  waypoints?: LatLng[];
  pois?: Poi[];
  currentPos?: LatLng | null;
  onMapClick?: (latlng: LatLng) => void;
  onStartDrag?: (latlng: LatLng) => void;
  onWaypointDrag?: (idx: number, latlng: LatLng) => void;
  onWaypointRemove?: (idx: number) => void;
  followPos?: boolean;
}

export function MapView({
  center = { lat: 46.6, lng: 1.88 },
  zoom = 6,
  route,
  start,
  waypoints = [],
  pois = [],
  currentPos,
  onMapClick,
  onStartDrag,
  onWaypointDrag,
  onWaypointRemove,
  followPos,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  // init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([center.lat, center.lng], zoom);
    L.tileLayer(API.OSM_TILES, {
      attribution: `${API.OSM_ATTRIBUTION} | ${'OSRM'} | Nominatim | Overpass | Open-Meteo`,
      maxZoom: 19,
    }).addTo(map);

    const layers = L.layerGroup().addTo(map);
    mapRef.current = map;
    layersRef.current = layers;

    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update layers when route/points change
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();

    const bounds = L.latLngBounds([]);

    // route polyline
    if (route?.coordinates?.length) {
      const latLngs: L.LatLngExpression[] = route.coordinates.map(([lon, lat]) => [lat, lon] as L.LatLngExpression);
      const poly = L.polyline(latLngs, { color: '#0ea5e9', weight: 5, opacity: 0.9 });
      poly.addTo(layers);
      latLngs.forEach((p) => bounds.extend(p as L.LatLngExpression));
    }

    // start marker
    if (start) {
      const m = L.marker([start.lat, start.lng], {
        draggable: !!onStartDrag,
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#10b981;color:white;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:800;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">D</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });
      if (onStartDrag) {
        m.on('dragend', () => {
          const ll = m.getLatLng();
          onStartDrag({ lat: ll.lat, lng: ll.lng });
        });
      }
      m.addTo(layers).bindPopup('Départ');
      bounds.extend([start.lat, start.lng]);
    }

    // waypoints
    waypoints.forEach((w, idx) => {
      const m = L.marker([w.lat, w.lng], {
        draggable: !!onWaypointDrag,
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#f97316;color:white;min-width:28px;height:28px;border-radius:999px;display:grid;place-items:center;font-weight:700;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);padding:0 6px;font-size:12px;">${idx + 1}<span style="margin-left:4px;cursor:pointer;" class="wp-del" data-idx="${idx}">×</span></div>`,
          iconSize: [32, 28],
          iconAnchor: [16, 14],
        }),
      });
      if (onWaypointDrag) {
        m.on('dragend', () => {
          const ll = m.getLatLng();
          onWaypointDrag(idx, { lat: ll.lat, lng: ll.lng });
        });
      }
      // custom remove handler via popup
      m.addTo(layers).bindPopup(`<button data-del="${idx}" style="background:#ef4444;color:white;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;">Supprimer</button>`);
      m.on('popupopen', (e: any) => {
        const btn = e.popup.getElement()?.querySelector(`button[data-del="${idx}"]`);
        if (btn) {
          btn.addEventListener('click', () => {
            onWaypointRemove?.(idx);
            map.closePopup();
          });
        }
      });
      bounds.extend([w.lat, w.lng]);
    });

    // POIs - simple blue markers
    pois.forEach((poi) => {
      const iconHtml =
        poi.type === 'drinking_water'
          ? '💧'
          : poi.type === 'toilets'
            ? '🚻'
            : poi.type === 'shelter'
              ? '🏕️'
              : poi.type === 'viewpoint'
                ? '🏞️'
                : '🪑';
      const m = L.marker([poi.lat, poi.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:white;border:1px solid #cbd5e1;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;box-shadow:0 1px 6px rgba(0,0,0,0.2);">${iconHtml}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      });
      m.addTo(layers).bindPopup(`${iconHtml} ${poi.type}<br/>${poi.name || ''}`);
      bounds.extend([poi.lat, poi.lng]);
    });

    // current position
    if (currentPos) {
      const m = L.marker([currentPos.lat, currentPos.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#0ea5e9;border:3px solid white;width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 6px rgba(14,165,233,0.25);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      });
      m.addTo(layers);
      if (followPos) {
        map.setView([currentPos.lat, currentPos.lng], Math.max(map.getZoom(), 15));
      } else {
        bounds.extend([currentPos.lat, currentPos.lng]);
      }
    }

    // fit bounds if route exists and not following
    if (route?.coordinates?.length && !followPos && bounds.isValid()) {
      try {
        map.fitBounds(bounds, { padding: [30, 30] });
      } catch {}
    } else if (!route && start && bounds.isValid() && !followPos) {
      map.setView([start.lat, start.lng], 14);
    }
  }, [route, start, waypoints, pois, currentPos, followPos, onStartDrag, onWaypointDrag, onWaypointRemove]);

  // invalidate size after mount (for hidden tabs)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(id);
  }, [route]);

  return <div ref={containerRef} className="map-container" style={{ width: '100%', height: '100%' }} />;
}
