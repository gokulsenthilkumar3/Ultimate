import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ state: {}, info: vi.fn() }));
vi.mock('../store/useStore', () => ({ default: selector => selector(mocks.state) }));
vi.mock('../hooks/useToast', () => ({ useToast: () => ({ info: mocks.info }) }));
import Current from './Current';

const originalGeo = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
const locate = vi.fn();
let client;
beforeEach(() => {
  mocks.state = { user: {}, appConfig: { currentSources: {} } }; mocks.info.mockClear(); locate.mockReset();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: locate } });
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No automatic provider calls expected'));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); if (originalGeo) Object.defineProperty(navigator, 'geolocation', originalGeo); else Reflect.deleteProperty(navigator, 'geolocation'); });
const show = () => render(<MemoryRouter><QueryClientProvider client={client}><Current /></QueryClientProvider></MemoryRouter>);

it('shows an honest source setup state and never requests location or provider data on entry', () => {
  show();
  expect(screen.getByRole('heading', { level: 1, name: 'Current' })).toBeVisible();
  expect(screen.getByText('News source not configured')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Weather' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'News' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Refresh news' })).toBeNull();
  expect(locate).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});

it('keeps location optional and usable when the owner declines the request', async () => {
  locate.mockImplementation((_success, error) => error({ code: 1 }));
  show(); fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  await waitFor(() => expect(mocks.info).toHaveBeenCalledWith('Enable location to load local weather.'));
  expect(locate).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Use my location' })).toBeEnabled();
});

it('presents cached stories with their real destinations and source details', () => {
  const source = { enabled: true, url: 'https://news.test/top.json', label: 'Configured source' };
  mocks.state.appConfig.currentSources.newsSources = [source];
  client.setQueryData(['news', source.url], [{ id: 'story', title: 'A saved source story', url: 'https://stories.test/read', score: 12, comments: 4, by: 'fixture-author', time: Date.now() }]);
  show();
  expect(screen.getByRole('link', { name: /A saved source story/ })).toHaveAttribute('href', 'https://stories.test/read');
  expect(screen.getByText('Configured source — Top Stories')).toBeVisible();
  expect(screen.getByText('01')).toBeVisible(); expect(screen.getByText(/12 · 4 comments · by fixture-author/)).toBeVisible();
  expect(fetch).not.toHaveBeenCalled(); expect(locate).not.toHaveBeenCalled();
});

const readyWeather = { current: { time: '2026-10-30T20:15', temperature_2m: 22, weather_code: 0, relative_humidity_2m: 64, apparent_temperature: 21, wind_speed_10m: 8 }, hourly: { time: ['2026-10-30T20:00'], visibility: [10000], uv_index: [0], precipitation_probability: [0] } };
function mockProvider() {
  fetch.mockImplementation(async url => String(url).includes('nominatim')
    ? { ok: true, json: async () => ({ address: { city: 'Sample city', country: 'Sample country' } }) }
    : { ok: true, json: async () => readyWeather });
  locate.mockImplementation(success => success({ coords: { latitude: 51.5, longitude: -.1 } }));
}

it('loads modern weather only after explicit location opt-in and presents the matching hourly details', async () => {
  mockProvider(); show(); expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  expect(await screen.findByText('Clear sky')).toBeVisible();
  expect(screen.getByText('64%')).toBeVisible(); expect(screen.getByText('0%')).toBeVisible(); expect(screen.getByText('0')).toBeVisible();
  const call = fetch.mock.calls.find(([url]) => String(url).includes('open-meteo'));
  expect(new URL(call[0]).searchParams.has('current_weather')).toBe(false);
  expect(screen.getByRole('button', { name: 'Weather' })).toBeEnabled();
});

it('keeps the last reading visible through a failed refresh and recovers from the inline retry', async () => {
  mockProvider(); show(); fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  await screen.findByText('Clear sky');
  fetch.mockRejectedValue(new Error('Provider offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Weather' }));
  expect(await screen.findByText('Could not refresh weather. Your last reading is shown.')).toBeVisible();
  expect(screen.getByText('Clear sky')).toBeVisible(); expect(screen.getByText('64%')).toBeVisible();
  mockProvider(); fireEvent.click(screen.getByRole('button', { name: 'Retry weather' }));
  await waitFor(() => expect(screen.queryByText(/Could not refresh weather/)).toBeNull());
  expect(screen.getByText('Clear sky')).toBeVisible();
});

it('does not call an explicitly disabled provider even when a location is already cached', () => {
  mocks.state.appConfig.weatherUrl = '';
  client.setQueryData(['location'], { lat: 51.5, lon: -.1 });
  client.setQueryData(['reverse-geo', 51.5, -.1], 'Sample city');
  show(); expect(screen.getByText(/Weather source not configured/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Weather' })).toBeDisabled(); expect(fetch).not.toHaveBeenCalled();
});
