import { cacheLife } from 'next/cache';
import { connection } from 'next/server';
import { createWeatherDb, hourlyForecastQuery } from '../lib/collections';
import {
  getForecast,
  getHourlyForecast,
  getLocations,
} from '../server/weather';
import { HourlyForecastClient } from './hourly-forecast';

async function hourlySnapshot(locationId: number) {
  'use cache';
  cacheLife({ stale: 60, revalidate: 300, expire: 1800 });
  const forecasts = await getHourlyForecast(locationId);
  const { db, queryClient } = createWeatherDb({
    locations: getLocations,
    forecast: getForecast,
    hourlyForecast: async () => forecasts,
  });
  try {
    await db.preloadLiveQuery({ query: hourlyForecastQuery(locationId) });
    return db.dehydrate({ shouldDehydrateCollection: () => false });
  } finally {
    await db.cleanup();
    queryClient.clear();
  }
}

export async function HourlyData({ locationId }: { locationId: number }) {
  // The rolling window uses request time, even when the forecast snapshot is cached.
  await connection();
  let state;
  try {
    state = await hourlySnapshot(locationId);
  } catch (error) {
    console.error('Hourly weather backend request failed', error);
  }
  return (
    <HourlyForecastClient
      locationId={locationId}
      state={state}
      now={Date.now()}
    />
  );
}
