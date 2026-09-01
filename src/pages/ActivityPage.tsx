import { ActivityView } from '../components/activity/ActivityView';
import { useGeneratorStore } from '../store/generatorStore';
import { useActivityStore } from '../store/activityStore';
import { useEffect } from 'react';

export function ActivityPage() {
  const genRoute = useGeneratorStore((s) => s.route);
  const { route, setRoute } = useActivityStore();

  useEffect(() => {
    if (!route && genRoute) setRoute(genRoute);
  }, [genRoute, route, setRoute]);

  return (
    <div className="main" style={{ flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <h2>Mode activité — suivi GPS</h2>
        <p style={{ fontSize: '.85rem', color: 'var(--text3)' }}>Le suivi fonctionne avec l'écran allumé. En arrière-plan/lock, le navigateur ne garantit pas le suivi comme une app native.</p>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ActivityView />
      </div>
    </div>
  );
}
