import { create } from 'zustand';
import type { AppPreferences } from '../types';
import { loadPreferences, savePreferences } from '../lib/storage';

interface SettingsState extends AppPreferences {
  set: (p: Partial<AppPreferences>) => void;
  reload: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...loadPreferences(),
  set: (p) => {
    savePreferences(p);
    set(p);
  },
  reload: () => set(loadPreferences()),
}));
