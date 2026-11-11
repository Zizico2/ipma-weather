import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { CodeTableKind, LocationKind } from './gen/ipma/proxy/v1/proxy_pb';
import { grpc } from './grpc';
import { mapForecasts, mapLocation } from './mappers';

export async function getLocations() {
  'use cache';
  cacheLife({ stale: 3600, revalidate: 86400, expire: 172800 });
  cacheTag('weather-locations');
  const response = await grpc.getLocations({ kind: LocationKind.WEATHER });
  return response.locations
    .map(mapLocation)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
}

async function getWeatherCodes() {
  'use cache';
  cacheLife('days');
  const response = await grpc.getCodeTable({
    kind: CodeTableKind.WEATHER_TYPE,
  });
  return response.entries;
}

export async function getForecast(locationId: number) {
  'use cache';
  cacheLife({ stale: 60, revalidate: 300, expire: 1800 });
  cacheTag(`weather:${locationId}`);
  const [response, codes] = await Promise.all([
    grpc.getWeatherForecast({
      target: { case: 'locationId', value: locationId },
    }),
    getWeatherCodes(),
  ]);
  return mapForecasts(response, codes);
}
