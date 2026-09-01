import * as LZString from 'lz-string';
import type { GeneratedRoute } from '../types';

export function encodeRouteToHash(route: GeneratedRoute): string {
  const payload = {
    t: route.title,
    s: route.sport,
    st: route.subtype,
    c: route.coordinates,
    d: route.distanceMeters,
    a: route.ascentMeters,
    p: route.params,
  };
  const json = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `#share=${compressed}`;
}

export function decodeRouteFromHash(hash: string): Partial<GeneratedRoute> | null {
  try {
    const match = hash.match(/#share=([^&]+)/);
    if (!match) return null;
    const decompressed = LZString.decompressFromEncodedURIComponent(match[1]);
    if (!decompressed) return null;
    const obj = JSON.parse(decompressed);
    return {
      title: obj.t,
      sport: obj.s,
      subtype: obj.st,
      coordinates: obj.c,
      distanceMeters: obj.d,
      ascentMeters: obj.a,
      params: obj.p,
    } as any;
  } catch {
    return null;
  }
}

export function buildShareUrl(route: GeneratedRoute): string {
  const hash = encodeRouteToHash(route);
  return `${window.location.origin}${window.location.pathname}${hash}`;
}
