import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { describe, expect, it } from 'vitest';
import {
  localDate,
  locationTimeZone,
  selectHourlyForecasts,
} from '../../src/lib/weather';
import { GetForecastResponseSchema } from '../../src/server/gen/ipma/public_data/v1/public_data_pb';
import { mapHourlyForecasts } from '../../src/server/mappers';

const at = (value: string) => timestampFromDate(new Date(value));
function rows(times: string[]) {
  return mapHourlyForecasts(
    create(GetForecastResponseSchema, {
      forecasts: times.map((time) => ({
        locationId: 1110600,
        periodHours: 1,
        forecastAt: at(time),
      })),
    }),
    [],
    1110600,
  );
}

describe('website-feed hourly boundary', () => {
  it('uses one-hour rows for the requested city and preserves missing/zero/negative values', () => {
    const response = create(GetForecastResponseSchema, {
      metadata: { fetchedAt: at('2026-11-13T20:00:00Z'), attribution: 'IPMA' },
      forecasts: [
        {
          locationId: 1110600,
          periodHours: 1,
          forecastAt: at('2026-11-13T21:00:00Z'),
          temperatureCelsius: -3,
          precipitationProbabilityPercent: 0,
          windSpeedKilometersPerHour: 0,
          weatherTypeCode: 999,
          upstreamUpdatedAt: at('2026-11-13T18:00:00Z'),
        },
        {
          locationId: 1110600,
          periodHours: 1,
          forecastAt: at('2026-11-13T20:00:00Z'),
          temperatureCelsius: 0,
        },
        {
          locationId: 1110600,
          periodHours: 3,
          forecastAt: at('2026-11-13T20:00:00Z'),
        },
        {
          locationId: 1110600,
          periodHours: 24,
          forecastAt: at('2026-11-13T20:00:00Z'),
        },
        {
          locationId: 1110600,
          periodHours: 7,
          forecastAt: at('2026-11-13T20:00:00Z'),
        },
        {
          locationId: 1131200,
          periodHours: 1,
          forecastAt: at('2026-11-13T20:00:00Z'),
        },
        { locationId: 1110600, periodHours: 1 },
      ],
    });
    const mapped = mapHourlyForecasts(response, [], 1110600);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      temperature: 0,
      rainProbability: null,
      humidity: null,
    });
    expect(mapped[1]).toMatchObject({
      temperature: -3,
      rainProbability: 0,
      windSpeed: 0,
      weatherCode: 999,
      condition: 'Conditions unavailable',
      updatedAt: '2026-11-13T18:00:00.000Z',
    });
    expect(JSON.parse(JSON.stringify(mapped))).toEqual(mapped);
    expect(mapped[0]).not.toHaveProperty('$typeName');
  });

  it('uses a ten-clock-hour window across midnight and does not extend it to fill gaps', () => {
    const data = rows([
      '2026-11-13T21:00:00Z',
      '2026-11-13T22:00:00Z',
      '2026-11-14T00:00:00Z',
      '2026-11-14T07:00:00Z',
      '2026-11-14T08:00:00Z',
    ]);
    expect(
      selectHourlyForecasts(
        data,
        'next',
        Date.parse('2026-11-13T22:00:00Z'),
        'Europe/Lisbon',
      ).map((row) => row.forecastAt),
    ).toEqual([
      '2026-11-13T22:00:00.000Z',
      '2026-11-14T00:00:00.000Z',
      '2026-11-14T07:00:00.000Z',
    ]);
  });

  it('uses the city local day in summer, the Azores, and repeated DST hours', () => {
    expect(locationTimeZone(3470100)).toBe('Atlantic/Azores');
    expect(locationTimeZone(2310300)).toBe('Europe/Lisbon');
    expect(localDate('2026-07-01T23:30:00Z', 'Europe/Lisbon')).toBe(
      '2026-07-02',
    );
    expect(localDate('2026-11-14T00:30:00Z', 'Atlantic/Azores')).toBe(
      '2026-11-13',
    );
    const data = rows(['2026-10-25T00:00:00Z', '2026-10-25T01:00:00Z']);
    expect(
      selectHourlyForecasts(
        data,
        'today',
        Date.parse('2026-10-25T02:00:00Z'),
        'Europe/Lisbon',
      ),
    ).toHaveLength(2);
    expect(
      selectHourlyForecasts([], 'today', Date.now(), 'Europe/Lisbon'),
    ).toEqual([]);
  });
});
