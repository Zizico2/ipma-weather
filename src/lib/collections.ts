import { collectionOptions, DbClient } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { Forecast, WeatherLocation } from './weather';

export interface WeatherLoader {
  locations(signal?: AbortSignal): Promise<WeatherLocation[]>;
  forecast(id: number, signal?: AbortSignal): Promise<Forecast[]>;
}

export const locationsCollection = collectionOptions(
  'weather-locations',
  (db) =>
    queryCollectionOptions({
      id: 'weather-locations',
      queryClient: db.requireDependency<QueryClient>('queryClient'),
      queryKey: ['weather-locations'],
      queryFn: ({ signal }) =>
        db.requireDependency<WeatherLoader>('loader').locations(signal),
      getKey: (row: WeatherLocation) => row.id,
      staleTime: 3_600_000,
      retry: false,
    }),
);

export function forecastCollection(id: number) {
  return collectionOptions(`weather-forecast:${id}`, (db) =>
    queryCollectionOptions({
      id: `weather-forecast:${id}`,
      queryClient: db.requireDependency<QueryClient>('queryClient'),
      queryKey: ['weather-forecast', id],
      queryFn: ({ signal }) =>
        db.requireDependency<WeatherLoader>('loader').forecast(id, signal),
      getKey: (row: Forecast) => row.id,
      staleTime: 300_000,
      retry: false,
    }),
  );
}

export function createWeatherDb(loader: WeatherLoader) {
  const queryClient = new QueryClient();
  const db = new DbClient({ queryClient, loader });
  return { db, queryClient };
}
