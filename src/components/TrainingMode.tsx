import { useState, useEffect } from 'react';
import type { GeneratedRoute } from '../types';

interface Interval { label: string; durationMin: number; intensity: 'échauffement' | 'effort' | 'récup' | 'cool-down'; }

export default function TrainingMode({ route }: { route: GeneratedRoute }) {
  const [intervals, setIntervals] = useState<Interval[]>([
    { label: 'Échauffement', durationMin: 10, intensity: 'échauffement' },
    { label: 'Fractionné 4× (2\' effort / 1\' récup)', durationMin: 12, intensity: 'effort' },
    { label: 'Retour au calme', durationMin: 5, intensity: 'cool-down' },
  ]);
  const [active, setActive] = useState<number | null>(null);
  const [secLeft, setSecLeft] = useState(0);

  useEffect(() => {
    if (active === null) return;
    if (secLeft <= 0) { setActive(null); return; }
    const id = setTimeout(() => setSecLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [active, secLeft]);

  const start = (idx: number) => { setActive(idx); setSecLeft(intervals[idx].durationMin * 60); if ('vibrate' in navigator) navigator.vibrate(200); };
  const totalMin = intervals.reduce((s, i) => s + i.durationMin, 0);

  return (
    <div className="rounded-xl border bg-card p-3 space-y-3">
      <h4 className="font-medium">Mode entraînement (intervalles)</h4>
      <p className="text-xs text-muted-foreground">Distance du parcours: {(route.distanceMeters / 1000).toFixed(1)} km — durée estimée {(route.estimatedDurationSeconds / 60).toFixed(0)} min. Plan d'intervalles total {totalMin} min.</p>
      <ul className="space-y-2">
        {intervals.map((it, idx) => (
          <li key={idx} className={`flex items-center justify-between rounded border p-2 text-sm ${active === idx ? 'bg-orange-50 border-orange-300' : 'bg-white'}`}>
            <span><strong>{it.label}</strong> — {it.durationMin} min <em className="text-xs">({it.intensity})</em> {active === idx && <span className="ml-2 font-mono">{Math.floor(secLeft / 60)}:{String(secLeft % 60).padStart(2, '0')}</span>}</span>
            <button onClick={() => start(idx)} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">{active === idx ? 'En cours' : 'Démarrer'}</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button onClick={() => setIntervals((arr) => [...arr, { label: 'Nouvel intervalle', durationMin: 5, intensity: 'effort' }])} className="text-xs underline">+ Ajouter intervalle</button>
        <button onClick={() => { setActive(null); setSecLeft(0); }} className="text-xs underline">Stop</button>
      </div>
    </div>
  );
}
