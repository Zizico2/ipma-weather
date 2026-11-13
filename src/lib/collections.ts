import { collectionOptions, DbClient, Query } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { Forecast, HourlyForecast, WeatherLocation } from './weather';

export interface WeatherLoader {
  hourlyForecast(id: number, signal?: AbortSignal): Promise<HourlyForecast[]>;
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

export function forecastQuery(locationId: number) {
  return new Query()
    .from({ forecast: forecastCollection(locationId) })
    .orderBy(({ forecast }) => forecast.date, 'asc');
}

export function hourlyForecastCollection(id: number) {
  return collectionOptions(`hourly-weather:${id}`, (db) =>
    queryCollectionOptions({
      id: `hourly-weather:${id}`,
      queryClient: db.requireDependency<QueryClient>('queryClient'),
      queryKey: ['hourly-weather', id],
      queryFn: ({ signal }) =>
        db
          .requireDependency<WeatherLoader>('loader')
          .hourlyForecast(id, signal),
      getKey: (row: HourlyForecast) => row.id,
      staleTime: 300_000,
      retry: false,
    }),
  );
}

export function hourlyForecastQuery(locationId: number) {
  return new Query()
    .from({ forecast: hourlyForecastCollection(locationId) })
    .orderBy(({ forecast }) => forecast.forecastAt, 'asc');
}
