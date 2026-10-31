import { afterEach, expect, it, vi } from 'vitest';
import { currentSources, DEFAULT_WEATHER_URL, loadWeather, normalizeWeather, weatherRequestUrl } from './currentWeather';

afterEach(() => vi.restoreAllMocks());
const location = { lat: 51.5, lon: -.1 };
const current = { time: '2026-10-30T20:15', temperature_2m: 12.9, relative_humidity_2m: 86, apparent_temperature: 11.6, weather_code: 1, wind_speed_10m: 10.1 };

it('uses the public config contract, supports older config, and respects an explicitly disabled source', () => {
  expect(currentSources({}).weatherUrl).toBe(DEFAULT_WEATHER_URL);
  expect(currentSources({ currentSources: { weatherUrl: '/legacy' } }).weatherUrl).toBe('/legacy');
  expect(currentSources({ weatherUrl: '/configured', currentSources: { weatherUrl: '/legacy' } }).weatherUrl).toBe('/configured');
  expect(currentSources({ weatherUrl: '' }).weatherUrl).toBe('');
  expect(currentSources({ newsSources: [{ url: '/news' }] }).newsSources).toEqual([{ url: '/news' }]);
});

it('requests only the modern response contract and preserves configured proxy parameters', () => {
  const url = new URL(weatherRequestUrl('/weather?region=test&current_weather=true&temperature_unit=fahrenheit', location));
  expect(url.pathname).toBe('/weather'); expect(url.searchParams.get('region')).toBe('test');
  expect(url.searchParams.has('current_weather')).toBe(false);
  expect(url.searchParams.get('current')).toContain('weather_code');
  expect(url.searchParams.get('hourly')).toBe('visibility,precipitation_probability,uv_index');
  expect(url.searchParams.get('temperature_unit')).toBe('celsius');
  expect(url.searchParams.get('wind_speed_unit')).toBe('kmh');
  expect(url.searchParams.get('latitude')).toBe('51.5');
});

it('uses the matching provider-local hour and retains real zero readings', () => {
  const result = normalizeWeather({ current, hourly: { time: ['2026-10-30T00:00', '2026-10-30T20:00'], visibility: [100, 10680], uv_index: [4, 0], precipitation_probability: [80, 0] } });
  expect(result.current).toMatchObject({ temperature_2m: 12.9, weather_code: 1, visibility: 10680, uv_index: 0, precipitation_probability: 0, relative_humidity_2m: 86 });
});

it('accepts the legacy response produced by the conflicting old request without inventing missing details', () => {
  const result = normalizeWeather({ current_weather: { time: current.time, temperature: 12.9, windspeed: 10.1, weathercode: 1 } });
  expect(result.current).toMatchObject({ temperature_2m: 12.9, wind_speed_10m: 10.1, weather_code: 1, visibility: null, uv_index: null, relative_humidity_2m: null });
});

it('never substitutes another hour or turns missing provider values into zero', () => {
  const result = normalizeWeather({ current, hourly: { time: ['2026-10-30T00:00'], visibility: [100], uv_index: [5] } });
  expect(result.current.visibility).toBeNull(); expect(result.current.uv_index).toBeNull();
  expect(() => normalizeWeather({ error: true, reason: 'Invalid request' })).toThrow();
  expect(() => normalizeWeather({ current: { temperature_2m: null } })).toThrow();
});

it('passes request cancellation through and rejects provider or invalid-response failures', async () => {
  const signal = new AbortController().signal;
  const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ current }) }).mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  expect((await loadWeather(DEFAULT_WEATHER_URL, location, signal)).current.temperature_2m).toBe(12.9);
  expect(fetcher.mock.calls[0][1].signal).toBe(signal);
  await expect(loadWeather(DEFAULT_WEATHER_URL, location, signal)).rejects.toThrow('Weather provider is unavailable');
  await expect(loadWeather(DEFAULT_WEATHER_URL, location, signal)).rejects.toThrow('no current conditions');
});
