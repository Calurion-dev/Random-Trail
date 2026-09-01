import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng } from '../types';

export function useGeolocation() {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef<number | null>(null);

  const getOnce = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setError(null);
      },
      (e) => setError(e.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) return;
    setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setError(null);
      },
      (e) => setError(e.message),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
  }, []);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  }, []);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  return { pos, error, watching, getOnce, startWatch, stopWatch };
}
