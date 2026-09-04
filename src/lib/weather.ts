export interface WeatherInfo {
  temperature: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
  daily?: { date: string; tmax: number; tmin: number; precip: number; windMax: number }[];
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherInfo | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data.current;
    const dailyRaw = data.daily;
    const codeMap: Record<number, string> = {
      0: 'Ciel dégagé', 1: 'Peu nuageux', 2: 'Partiellement nuageux', 3: 'Couvert',
      45: 'Brouillard', 51: 'Bruine', 61: 'Pluie faible', 63: 'Pluie', 65: 'Pluie forte',
      71: 'Neige faible', 75: 'Neige', 80: 'Averses', 95: 'Orage',
    };
    const condition = codeMap[cur.weather_code] || `Code ${cur.weather_code}`;
    const daily = dailyRaw ? dailyRaw.time.map((t: string, i: number) => ({
      date: t,
      tmax: dailyRaw.temperature_2m_max[i],
      tmin: dailyRaw.temperature_2m_min[i],
      precip: dailyRaw.precipitation_sum[i],
      windMax: dailyRaw.wind_speed_10m_max[i],
    })) : undefined;
    return {
      temperature: cur.temperature_2m,
      windSpeed: cur.wind_speed_10m,
      precipitation: cur.precipitation,
      condition,
      daily,
    };
  } catch { return null; }
}
