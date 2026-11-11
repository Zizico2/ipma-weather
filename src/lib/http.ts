import type { WeatherLoader } from './collections';
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
