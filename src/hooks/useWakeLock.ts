import { useCallback, useEffect, useRef, useState } from 'react';

export function useWakeLock() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const lockRef = useRef<any>(null);

  useEffect(() => {
    setSupported('wakeLock' in navigator);
  }, []);

  const request = useCallback(async () => {
    if (!('wakeLock' in navigator)) return false;
    try {
      // @ts-ignore
      lockRef.current = await (navigator as any).wakeLock.request('screen');
      setActive(true);
      lockRef.current.addEventListener('release', () => setActive(false));
      return true;
    } catch {
      return false;
    }
  }, []);

  const release = useCallback(async () => {
    try {
      await lockRef.current?.release();
      lockRef.current = null;
      setActive(false);
    } catch {}
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && lockRef.current === null && active) {
        request();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active, request]);

  return { supported, active, request, release };
}
