import { create } from 'zustand';
import type { SavedRoute, GeneratedRoute } from '../types';
import { db } from '../db/dexie';

interface SavedState {
  routes: SavedRoute[];
  loading: boolean;
  load: () => Promise<void>;
  save: (route: GeneratedRoute, title?: string) => Promise<string>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
}

export const useSavedRoutesStore = create<SavedState>((set, get) => ({
  routes: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const all = await db.routes.toArray();
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    set({ routes: all, loading: false });
  },

  save: async (route, title) => {
    const saved: SavedRoute = {
      ...route,
      id: route.id.startsWith('gen-') ? `saved-${Date.now()}` : route.id,
      title: title || route.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.routes.put(saved);
    await get().load();
    return saved.id;
  },

  remove: async (id) => {
    await db.routes.delete(id);
    await get().load();
  },

  rename: async (id, title) => {
    const r = await db.routes.get(id);
    if (!r) return;
    await db.routes.put({ ...r, title, updatedAt: new Date().toISOString() });
    await get().load();
  },

  duplicate: async (id) => {
    const r = await db.routes.get(id);
    if (!r) return;
    const copy: SavedRoute = {
      ...r,
      id: `saved-${Date.now()}`,
      title: r.title + ' (copie)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.routes.put(copy);
    await get().load();
  },
}));
