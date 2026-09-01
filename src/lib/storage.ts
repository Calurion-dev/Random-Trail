import type { AppPreferences, LatLng } from '../types';
import { DEFAULT_PREFERENCES } from '../constants/defaults';

const PREF_KEY = 'randomparcours:prefs';

export function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs: Partial<AppPreferences>) {
  try {
    const current = loadPreferences();
    const next = { ...current, ...prefs };
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function saveLastStart(pos: LatLng, label: string) {
  savePreferences({ lastStart: pos, lastStartLabel: label });
}

export function getTheme(): 'light' | 'dark' | 'system' {
  return loadPreferences().theme ?? 'system';
}

export function setTheme(theme: 'light' | 'dark' | 'system') {
  savePreferences({ theme });
}
