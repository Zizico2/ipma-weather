import type { WeatherLoader } from './collections';
import { type SavedPlacesLoader, savedPlaceSchema } from './saved-places';
import { forecastSchema, locationSchema } from './weather';

async function get(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { signal });
  if (!response.ok)
    throw new Error('Weather is temporarily unavailable. Please try again.');
  return response.json();
}

export const httpLoader: WeatherLoader = {
  locations: async (signal) =>
    locationSchema.array().parse(await get('/api/locations', signal)),
  forecast: async (id, signal) =>
    forecastSchema.array().parse(await get(`/api/forecasts/${id}`, signal)),
};

async function writeSavedPlace(id: number, method: 'POST' | 'DELETE') {
  const response = await fetch(`/api/saved-places/${id}`, { method });
  if (!response.ok) throw new Error('Could not save your places.');
  return response;
}

export const savedPlacesHttpLoader: SavedPlacesLoader = {
  list: async (signal) =>
    savedPlaceSchema.array().parse(await get('/api/saved-places', signal)),
  save: async (id) =>
    savedPlaceSchema.parse(await (await writeSavedPlace(id, 'POST')).json()),
  remove: async (id) => {
    await writeSavedPlace(id, 'DELETE');
  },
};
