import { useEffect } from 'react';
import { useSavedRoutesStore } from '../../store/savedRoutesStore';
import { SavedRouteCard } from './SavedRouteCard';

export function SavedRoutesList({ onLoadRoute }: { onLoadRoute?: () => void }) {
  const { routes, load, loading } = useSavedRoutesStore();

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 16 }}>Chargement...</div>;
  if (!routes.length) return <div style={{ padding: 16, color: 'var(--text3)' }}>Aucun parcours enregistré. Générez un parcours puis enregistrez-le.</div>;

  return (
    <div className="saved-list">
      {routes.map((r) => (
        <SavedRouteCard key={r.id} route={r} onLoad={onLoadRoute} />
      ))}
    </div>
  );
}
