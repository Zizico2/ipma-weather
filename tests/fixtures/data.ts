import type { MessageInitShape } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import type { GetWeatherForecastResponseSchema } from '../../src/server/gen/ipma/proxy/v1/proxy_pb';

export const locations = [
  {
    locationId: 1110600,
    name: 'Lisboa',
    coordinates: { latitude: 38.77, longitude: -9.13 },
  },
  {
    locationId: 1131200,
    name: 'Porto',
    coordinates: { latitude: 41.16, longitude: -8.62 },
  },
  {
    locationId: 1080500,
    name: 'Faro',
    coordinates: { latitude: 37.02, longitude: -7.92 },
  },
  {
    locationId: 1090700,
    name: 'Guarda',
    coordinates: { latitude: 40.54, longitude: -7.27 },
  },
  {
    locationId: 1060500,
    name: 'Coimbra',
    coordinates: { latitude: 40.21, longitude: -8.43 },
  },
  {
    locationId: 1030300,
    name: 'Braga',
    coordinates: { latitude: 41.55, longitude: -8.42 },
  },
];

export function fixtureForecast(
  locationId: number,
): MessageInitShape<typeof GetWeatherForecastResponseSchema> {
  return {
    metadata: {
      attribution: 'IPMA, I.P. (test fixture)',
      sourceUrl: 'https://api.ipma.pt/open-data/',
      fetchedAt: timestampFromDate(new Date('2026-11-11T09:00:00Z')),
      upstreamUpdatedAt: timestampFromDate(new Date('2026-11-11T08:00:00Z')),
    },
    forecasts:
      locationId === 1060500
        ? []
        : Array.from({ length: 5 }, (_, index) => ({
            locationId,
            date: { year: 2026, month: 11, day: 11 + index },
            maximumTemperatureCelsius:
              locationId === 1090700
                ? undefined
                : (locationId === 1131200 ? 17 : 22) + index,
            minimumTemperatureCelsius: locationId === 1090700 ? -3 : 12 + index,
            precipitationProbabilityPercent:
              locationId === 1090700 ? undefined : index * 20,
            prevailingWindDirection: 'NW',
            weatherTypeCode: index === 0 ? 1 : 7,
          })),
  };
}

export function fixtureHourlyForecast(
  locationId: number,
): import('@bufbuild/protobuf').MessageInitShape<
  typeof import('../../src/server/gen/ipma/public_data/v1/public_data_pb').GetForecastResponseSchema
> {
  // Relative to the fixture server's clock, so browser windows remain meaningful.
  const first = Math.ceil(Date.now() / 3_600_000) * 3_600_000;
  return {
    metadata: {
      attribution: 'IPMA, I.P. (hourly test fixture)',
      sourceUrl: `https://api.ipma.pt/public-data/forecast/aggregate/${locationId}.json`,
      fetchedAt: timestampFromDate(new Date(first - 3_600_000)),
    },
    forecasts:
      locationId === 1060500
        ? []
        : [
            ...Array.from({ length: 48 }, (_, index) => ({
              locationId,
              forecastAt: timestampFromDate(
                new Date(first + index * 3_600_000),
              ),
              periodHours: 1,
              temperatureCelsius:
                locationId === 1090700
                  ? undefined
                  : index === 0
                    ? 0
                    : 12 + (index % 8),
              relativeHumidityPercent: 65,
              windSpeedKilometersPerHour: index === 0 ? 0 : 14,
              windDirection: 'NW',
              weatherTypeCode: index % 2 ? 7 : 1,
              precipitationProbabilityPercent: index === 0 ? 0 : 20,
              upstreamUpdatedAt: timestampFromDate(new Date(first - 7_200_000)),
            })),
            {
              locationId,
              forecastAt: timestampFromDate(new Date(first)),
              periodHours: 3,
              temperatureCelsius: 99,
            },
            {
              locationId,
              forecastAt: timestampFromDate(new Date(first)),
              periodHours: 24,
              temperatureCelsius: 98,
            },
          ],
  };
}
