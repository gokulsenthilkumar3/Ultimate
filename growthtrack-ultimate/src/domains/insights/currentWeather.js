const CURRENT = 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m';
const HOURLY = 'visibility,precipitation_probability,uv_index';
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
export const DEFAULT_WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
export const WEATHER_CODES = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Foggy', '🌫️'], 48: ['Icy fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'], 57: ['Heavy freezing drizzle', '🌧️'], 61: ['Light rain', '🌧️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'], 67: ['Heavy freezing rain', '🌧️'], 71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'],
  77: ['Snow grains', '🌨️'], 80: ['Showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Violent showers', '⛈️'],
  85: ['Snow showers', '🌨️'], 86: ['Heavy snow showers', '❄️'], 95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm with hail', '⛈️'], 99: ['Thunderstorm with hail', '⛈️'],
};

export function currentSources(config = {}) {
  const legacy = config.currentSources || {};
  return {
    // A deliberately blank source remains disabled. The public default is used only after opt-in location.
    weatherUrl: config.weatherUrl ?? legacy.weatherUrl ?? DEFAULT_WEATHER_URL,
    weatherCodes: legacy.weatherCodes || WEATHER_CODES,
    newsSources: config.newsSources ?? legacy.newsSources ?? [],
  };
}

/** Keep configured proxy/auth parameters, but request one consistent provider contract. */
export function weatherRequestUrl(source, location) {
  const url = new URL(source, window.location.origin);
  url.searchParams.delete('current_weather');
  Object.entries({ latitude: location.lat, longitude: location.lon, current: CURRENT, hourly: HOURLY,
    timezone: 'auto', forecast_days: 1, temperature_unit: 'celsius', wind_speed_unit: 'kmh', timeformat: 'iso8601', format: 'json',
  }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url.toString();
}

/** Hourly details use the provider's local hour, not the browser's timezone. */
export function normalizeWeather(data) {
  const current = data?.current || data?.current_weather;
  const temperature = number(current?.temperature_2m ?? current?.temperature);
  if (data?.error || !current || temperature === null) throw new Error('Weather response has no current conditions');
  const hour = typeof current.time === 'string' ? current.time.slice(0, 13) : '';
  const index = hour ? data.hourly?.time?.findIndex(time => typeof time === 'string' && time.slice(0, 13) === hour) ?? -1 : -1;
  const detail = key => number(current[key]) ?? (index >= 0 ? number(data.hourly?.[key]?.[index]) : null);
  return {
    current: {
      time: current.time, temperature_2m: temperature,
      weather_code: number(current.weather_code ?? current.weathercode),
      relative_humidity_2m: number(current.relative_humidity_2m ?? current.relativehumidity_2m),
      wind_speed_10m: number(current.wind_speed_10m ?? current.windspeed_10m ?? current.windspeed),
      apparent_temperature: number(current.apparent_temperature),
      visibility: detail('visibility'), uv_index: detail('uv_index'), precipitation_probability: detail('precipitation_probability'),
    },
  };
}

export async function loadWeather(source, location, signal) {
  const response = await fetch(weatherRequestUrl(source, location), { signal });
  if (!response.ok) throw new Error('Weather provider is unavailable');
  return normalizeWeather(await response.json());
}
