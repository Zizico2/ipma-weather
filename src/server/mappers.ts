import { timestampDate } from '@bufbuild/protobuf/wkt';
import type { Forecast, WeatherLocation } from '../lib/weather';
import type {
  CodeEntry,
  GetWeatherForecastResponse,
  Location,
  WeatherForecast,
} from './gen/ipma/proxy/v1/proxy_pb';

export function mapLocation(location: Location): WeatherLocation {
  return {
    id: location.locationId,
    name: location.name,
    latitude: location.coordinates?.latitude ?? null,
    longitude: location.coordinates?.longitude ?? null,
  };
}

export function mapForecasts(
  response: GetWeatherForecastResponse,
  codes: CodeEntry[],
): Forecast[] {
  const descriptions = new Map(
    codes.map((entry) => [
      entry.code,
      entry.descriptionEnglish || entry.descriptionPortuguese,
    ]),
  );
  const metadata = response.metadata;
  return response.forecasts
    .filter(
      (
        row,
      ): row is WeatherForecast & {
        date: NonNullable<WeatherForecast['date']>;
      } => Boolean(row.date),
    )
    .map((row) => {
      const date = `${row.date.year}-${String(row.date.month).padStart(2, '0')}-${String(row.date.day).padStart(2, '0')}`;
      return {
        id: `${row.locationId}:${date}`,
        locationId: row.locationId,
        date,
        minimum: row.minimumTemperatureCelsius ?? null,
        maximum: row.maximumTemperatureCelsius ?? null,
        rain: row.precipitationProbabilityPercent ?? null,
        windDirection: row.prevailingWindDirection,
        weatherCode: row.weatherTypeCode ?? null,
        condition:
          descriptions.get(row.weatherTypeCode ?? -99) ||
          'Conditions unavailable',
        fetchedAt: metadata?.fetchedAt
          ? timestampDate(metadata.fetchedAt).toISOString()
          : null,
        updatedAt: metadata?.upstreamUpdatedAt
          ? timestampDate(metadata.upstreamUpdatedAt).toISOString()
          : null,
        sourceUrl: metadata?.sourceUrl ?? '',
        attribution:
          metadata?.attribution ||
          'IPMA — Instituto Português do Mar e da Atmosfera',
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
