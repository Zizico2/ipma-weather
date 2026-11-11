import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { createWeatherDb, forecastQuery } from '../lib/collections';
import { getForecast, getLocations } from '../server/weather';
import { RememberLocation } from './remember-location';
import { WeatherClient } from './weather-client';

export async function CityForecast({ locationId }: { locationId: number }) {
  const locations = await getLocations();
  if (!locations.some((location) => location.id === locationId)) notFound();
  return (
    <>
      <RememberLocation locationId={locationId} />
      <WeatherData locationId={locationId} />
    </>
  );
}

export async function WeatherData({ locationId }: { locationId: number }) {
  'use cache';
  // DB preloading records timestamps internally. Cache the serialized snapshot
  // together with the data so it is safe to include in Next's prerendered shell.
  cacheLife({ stale: 60, revalidate: 300, expire: 1800 });
  const locations = await getLocations();
  const location = locations.find((location) => location.id === locationId);
  if (!location) notFound();
  const forecasts = await getForecast(locationId);
  // Each server render owns its DB and QueryClient. No process-wide collection state.
  const { db, queryClient } = createWeatherDb({
    locations: async () => locations,
    forecast: async () => forecasts,
  });
  try {
    await db.preloadLiveQuery({ query: forecastQuery(locationId) });
    return (
      <WeatherClient
        key={locationId}
        location={location}
        state={db.dehydrate({ shouldDehydrateCollection: () => false })}
      />
    );
  } finally {
    await db.cleanup();
    queryClient.clear();
  }
}
