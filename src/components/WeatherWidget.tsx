import { useEffect, useState } from 'react';
import { fetchWeather, type WeatherInfo } from '../lib/weather';
import { useGeneratorStore } from '../store/generatorStore';

export default function WeatherWidget() {
  const { params, route } = useGeneratorStore();
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const pos = route?.coordinates?.[0] ? { lat: route.coordinates[0][1], lng: route.coordinates[0][0] } : params.start;
  useEffect(() => {
    if (!pos) return;
    setLoading(true);
    fetchWeather(pos.lat, pos.lng).then((w) => { setWeather(w); setLoading(false); });
  }, [pos?.lat, pos?.lng]);

  if (!pos) return null;
  if (loading) return <div className="rounded-xl border bg-card p-3 text-sm">Météo: chargement…</div>;
  if (!weather) return null;
  return (
    <div className="rounded-xl border bg-card p-3 text-sm space-y-2">
      <h4 className="font-medium">Météo au départ</h4>
      <p>{weather.condition} — {weather.temperature}°C, vent {weather.windSpeed} km/h, précipitations {weather.precipitation} mm</p>
      {weather.daily && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {weather.daily.slice(0, 3).map((d) => (
            <div key={d.date} className="rounded border p-2 text-center">
              <div className="font-medium">{d.date.slice(5)}</div>
              <div>{d.tmin}–{d.tmax}°C</div>
              <div>{d.precip} mm</div>
              <div>{d.windMax} km/h</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
