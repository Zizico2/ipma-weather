import { Hono } from 'hono';
import type { Forecast, WeatherLocation } from '../lib/weather';
import { parseLocationId } from '../lib/weather';

export interface WeatherService {
  getLocations(): Promise<WeatherLocation[]>;
  getForecast(id: number): Promise<Forecast[]>;
}

export function createWeatherApi(service: WeatherService) {
  return new Hono()
    .basePath('/api')
    .get('/locations', async (c) => c.json(await service.getLocations()))
    .get('/forecasts/:id', async (c) => {
      const id = parseLocationId(c.req.param('id'));
      if (id === null) return c.json({ error: 'Invalid location ID.' }, 400);
      const locations = await service.getLocations();
      if (!locations.some((location) => location.id === id))
        return c.json({ error: 'Location not found.' }, 404);
      return c.json(await service.getForecast(id));
    })
    .notFound((c) => c.json({ error: 'API route not found.' }, 404))
    .onError((error, c) => {
      console.error('Weather backend request failed', error);
      return c.json(
        { error: 'Weather is temporarily unavailable. Please try again.' },
        503,
      );
    });
}
