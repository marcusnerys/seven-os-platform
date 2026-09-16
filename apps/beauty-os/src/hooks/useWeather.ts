import { useState, useEffect } from 'react';

export interface WeatherData {
  temp: number;
  condition: string;
  emoji: string;
  city: string;
  humidity: number;
  windspeed: number;
  tip: string;
}

const WMO_MAP: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Céu limpo',        emoji: '☀️' },
  1:  { label: 'Principalmente limpo', emoji: '🌤️' },
  2:  { label: 'Parcialmente nublado', emoji: '⛅' },
  3:  { label: 'Nublado',          emoji: '☁️' },
  45: { label: 'Neblina',          emoji: '🌫️' },
  48: { label: 'Geada',            emoji: '🌫️' },
  51: { label: 'Garoa leve',       emoji: '🌦️' },
  53: { label: 'Garoa moderada',   emoji: '🌦️' },
  55: { label: 'Garoa intensa',    emoji: '🌧️' },
  61: { label: 'Chuva leve',       emoji: '🌧️' },
  63: { label: 'Chuva moderada',   emoji: '🌧️' },
  65: { label: 'Chuva forte',      emoji: '🌧️' },
  71: { label: 'Neve leve',        emoji: '❄️' },
  73: { label: 'Neve moderada',    emoji: '❄️' },
  75: { label: 'Neve intensa',     emoji: '❄️' },
  77: { label: 'Grãos de neve',    emoji: '🌨️' },
  80: { label: 'Pancadas de chuva', emoji: '🌦️' },
  81: { label: 'Pancadas fortes',  emoji: '🌧️' },
  82: { label: 'Pancadas violentas', emoji: '⛈️' },
  85: { label: 'Pancadas de neve', emoji: '🌨️' },
  86: { label: 'Pancadas de neve intensas', emoji: '🌨️' },
  95: { label: 'Trovoada',         emoji: '⛈️' },
  96: { label: 'Trovoada com granizo', emoji: '⛈️' },
  99: { label: 'Trovoada intensa', emoji: '⛈️' },
};

function getBeautyTip(code: number, temp: number): string {
  if (code >= 95) return 'Trovoada — confirme os agendamentos com antecedência';
  if (code >= 61 && code < 82) return 'Dia de chuva — clientes podem atrasar, tenha flexibilidade';
  if (code >= 51 && code < 61) return 'Garoa hoje — lembre suas clientes de trazer guarda-chuva';
  if (code >= 45 && code < 51) return 'Neblina pela manhã — visibilidade reduzida nas estradas';
  if (temp >= 32) return 'Calor intenso — reforce a hidratação e o ar-condicionado';
  if (temp >= 26) return 'Dia quente — ótimo para atendimentos de beleza ✨';
  if (temp <= 16) return 'Dia frio — clientes adoram atendimentos aconchegantes';
  return 'Dia agradável para atender com tranquilidade ✨';
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); setError(true); return; }

    const cached = sessionStorage.getItem('beautyos_weather');
    if (cached) {
      try { setWeather(JSON.parse(cached)); setLoading(false); return; } catch {}
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const [meteoRes, geoRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
              `&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&timezone=auto`
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { 'Accept-Language': 'pt-BR' } }
            ),
          ]);

          const meteo = await meteoRes.json();
          const geo   = await geoRes.json();

          const cur  = meteo.current;
          const code = cur.weathercode as number;
          const wmo  = WMO_MAP[code] ?? { label: 'Variável', emoji: '🌡️' };
          const city = geo?.address?.city || geo?.address?.town || geo?.address?.village || 'Sua cidade';

          const data: WeatherData = {
            temp:      Math.round(cur.temperature_2m),
            condition: wmo.label,
            emoji:     wmo.emoji,
            city,
            humidity:  Math.round(cur.relative_humidity_2m),
            windspeed: Math.round(cur.windspeed_10m),
            tip:       getBeautyTip(code, cur.temperature_2m),
          };

          setWeather(data);
          sessionStorage.setItem('beautyos_weather', JSON.stringify(data));
        } catch {
          setError(true);
        } finally {
          setLoading(false);
        }
      },
      () => { setLoading(false); setError(true); },
      { timeout: 8000 }
    );
  }, []);

  return { weather, loading, error };
}
