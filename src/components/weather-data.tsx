import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import {
  createWeatherDb,
  forecastCollection,
  locationsCollection,
} from '../lib/collections';
import { getForecast, getLocations } from '../server/weather';
import { WeatherClient } from './weather-client';

export async function WeatherData({ locationId }: { locationId: number }) {
  'use cache';
  // DB preloading records timestamps internally. Cache the serialized snapshot
  // together with the data so it is safe to include in Next's prerendered shell.
  cacheLife({ stale: 60, revalidate: 300, expire: 1800 });
  const locations = await getLocations();
  if (!locations.some((location) => location.id === locationId)) notFound();
  const forecasts = await getForecast(locationId);
  // Each server render owns its DB and QueryClient. No process-wide collection state.
  const { db, queryClient } = createWeatherDb({
    locations: async () => locations,
    forecast: async () => forecasts,
  });
  try {
    await Promise.all([
      db.collection(locationsCollection).preload(),
      db.collection(forecastCollection(locationId)).preload(),
    ]);
    return (
      <WeatherClient
        key={locationId}
        locationId={locationId}
        state={db.dehydrate()}
      />
    );
  } finally {
    await db.cleanup();
    queryClient.clear();
  }
}
