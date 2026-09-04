import { useState } from 'react';
import { useGeneratorStore } from '../store/generatorStore';

export default function WaypointList() {
  const { params, removeWaypoint, reorderWaypoints } = useGeneratorStore();
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  if (!params.waypoints.length) return <p className="text-sm text-muted-foreground">Aucune étape. Activez le mode manuel et cliquez sur la carte.</p>;

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
  };
  const handleDrop = (idx: number) => {
    if (dragIdx !== null && dragIdx !== idx) {
      reorderWaypoints(dragIdx, idx);
    }
    setDragIdx(null);
  };

  return (
    <ul className="space-y-2">
      {params.waypoints.map((wp, idx) => (
        <li
          key={idx}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={() => setDragIdx(null)}
          className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm ${dragIdx === idx ? 'opacity-50' : ''}`}
        >
          <span className="cursor-grab select-none text-muted-foreground" title="Glisser pour réordonner">⋮⋮</span>
          <span className="flex-1 text-sm">Étape {idx + 1}: {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}</span>
          <button
            onClick={() => idx > 0 && reorderWaypoints(idx, idx - 1)}
            disabled={idx === 0}
            className="rounded p-1 text-sm disabled:opacity-30"
            title="Monter"
          >↑</button>
          <button
            onClick={() => idx < params.waypoints.length - 1 && reorderWaypoints(idx, idx + 1)}
            disabled={idx === params.waypoints.length - 1}
            className="rounded p-1 text-sm disabled:opacity-30"
            title="Descendre"
          >↓</button>
          <button onClick={() => removeWaypoint(idx)} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">Suppr.</button>
        </li>
      ))}
    </ul>
  );
}
