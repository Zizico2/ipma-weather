import { hc, type InferResponseType } from 'hono/client';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { WeatherLoader } from '../../src/lib/collections';
import type { Forecast, WeatherLocation } from '../../src/lib/weather';
import { createWeatherClient } from '../../src/sdk/weather';
import { createWeatherApi, type WeatherApi } from '../../src/server/api';

type ClientRoutes = ReturnType<typeof hc<WeatherApi>>;

const location: WeatherLocation = {
  id: 1110600,
  name: 'Lisboa',
  latitude: null,
  longitude: null,
};
const forecast: Forecast = {
  id: '1110600:2026-11-11',
  locationId: 1110600,
  date: '2026-11-11',
  minimum: 10,
  maximum: 18,
  rain: 0,
  windDirection: 'N',
  condition: 'Clear',
  weatherCode: 1,
  fetchedAt: null,
  updatedAt: null,
  attribution: 'IPMA',
  sourceUrl: 'https://www.ipma.pt',
};

describe('weather RPC client', () => {
  const service = {
    getLocations: vi.fn(async () => [location]),
    getForecast: vi.fn(async () => [forecast]),
  };
  const app = createWeatherApi(service);
  const fetch: typeof globalThis.fetch = async (input, init) =>
    app.request(input, init);
  const client: WeatherLoader = createWeatherClient({ fetch });
  const rpc = hc<WeatherApi>('http://127.0.0.1', { fetch });

  it('follows the typed route paths and their response DTOs', () => {
    expect(rpc.api.locations.$path()).toBe('/api/locations');
    expect(rpc.api.forecasts[':id'].$path({ param: { id: '1110600' } })).toBe(
      '/api/forecasts/1110600',
    );
    expectTypeOf<
      InferResponseType<ClientRoutes['api']['locations']['$get'], 200>
    >().toEqualTypeOf<WeatherLocation[]>();
    expectTypeOf<
      InferResponseType<ClientRoutes['api']['forecasts'][':id']['$get'], 200>
    >().toEqualTypeOf<Forecast[]>();
  });

  it('returns the JSON the route handlers declare', async () => {
    expect(await client.locations()).toEqual([location]);
    expect(await client.forecast(1110600)).toEqual([forecast]);
  });

  it('turns non-OK responses into the client error', async () => {
    await expect(client.forecast(0)).rejects.toThrow(
      'Weather is temporarily unavailable. Please try again.',
    );
    await expect(client.forecast(123)).rejects.toThrow(
      'Weather is temporarily unavailable. Please try again.',
    );
  });
});
