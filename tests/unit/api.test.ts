import { describe, expect, it, vi } from 'vitest';
import { createWeatherApi } from '../../src/server/api';

describe('Hono API', () => {
  const service = {
    getHourlyForecast: vi.fn(async () => []),
    getLocations: vi.fn(async () => [
      { id: 1110600, name: 'Lisboa', latitude: null, longitude: null },
    ]),
    getForecast: vi.fn(async () => []),
  };
  const app = createWeatherApi(service);
  it('validates IDs before contacting the backend', async () => {
    service.getForecast.mockClear();
    expect((await app.request('/api/forecasts/1e6')).status).toBe(400);
    expect(service.getForecast).not.toHaveBeenCalled();
  });
  it('rejects unknown locations', async () =>
    expect((await app.request('/api/forecasts/123')).status).toBe(404));
  it('returns forecast DTOs for valid locations', async () => {
    const response = await app.request('/api/forecasts/1110600');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
  it('validates hourly requests and returns independent DTOs', async () => {
    service.getHourlyForecast.mockClear();
    expect((await app.request('/api/hourly-forecasts/1e6')).status).toBe(400);
    expect((await app.request('/api/hourly-forecasts/123')).status).toBe(404);
    expect(service.getHourlyForecast).not.toHaveBeenCalled();
    const response = await app.request('/api/hourly-forecasts/1110600');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
  it('returns a safe 503 when gRPC fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const broken = createWeatherApi({
        ...service,
        getForecast: async () => {
          throw new Error('private backend address');
        },
      });
      const response = await broken.request('/api/forecasts/1110600');
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain('private backend address');
    } finally {
      log.mockRestore();
    }
  });
});
