import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Forecast, WeatherLocation } from '../lib/weather';
import { parseLocationId } from '../lib/weather';
import { createSavedPlacesApi } from './saved-places-api';
import type { SavedPlacesStore } from './saved-places-store';

export interface WeatherService {
  getLocations(): Promise<WeatherLocation[]>;
  getForecast(id: number): Promise<Forecast[]>;
}

export function createWeatherApi(
  service: WeatherService,
  savedPlaces?: SavedPlacesStore,
) {
  const app = new Hono()
    .basePath('/api')
    .get('/locations', async (c) => c.json(await service.getLocations()))
    .get('/forecasts/:id', async (c) => {
      const id = parseLocationId(c.req.param('id'));
      if (id === null) return c.json({ error: 'Invalid location ID.' }, 400);
      const locations = await service.getLocations();
      if (!locations.some((location) => location.id === id))
        return c.json({ error: 'Location not found.' }, 404);
      return c.json(await service.getForecast(id));
    });
  if (savedPlaces)
    app.route('/saved-places', createSavedPlacesApi(savedPlaces, service));
  return app
    .notFound((c) => c.json({ error: 'API route not found.' }, 404))
    .onError((error, c) => {
      if (error instanceof HTTPException) return error.getResponse();
      console.error('Weather backend request failed', error);
      return c.json(
        { error: 'Weather is temporarily unavailable. Please try again.' },
        503,
      );
    });
}
