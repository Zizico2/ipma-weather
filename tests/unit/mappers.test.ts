import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';
import { GetWeatherForecastResponseSchema } from '../../src/server/gen/ipma/proxy/v1/proxy_pb';
import { mapForecasts } from '../../src/server/mappers';
import { fixtureForecast } from '../fixtures/data';

describe('protobuf boundary', () => {
  it('maps protobuf data to serializable browser DTOs without inventing missing measurements', () => {
    const response = create(
      GetWeatherForecastResponseSchema,
      fixtureForecast(1090700),
    );
    const [first] = mapForecasts(response, []);
    expect(first).toMatchObject({
      date: '2026-11-11',
      maximum: null,
      minimum: -3,
      rain: null,
      fetchedAt: '2026-11-11T09:00:00.000Z',
    });
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(first).not.toHaveProperty('$typeName');
  });
  it('preserves real zeroes and omits rows without a date', () => {
    const response = create(GetWeatherForecastResponseSchema, {
      forecasts: [
        {
          locationId: 1110600,
          date: { year: 2026, month: 11, day: 11 },
          minimumTemperatureCelsius: 0,
          precipitationProbabilityPercent: 0,
        },
        { locationId: 1110600 },
      ],
    });
    expect(mapForecasts(response, [])).toHaveLength(1);
    expect(mapForecasts(response, [])[0]).toMatchObject({
      minimum: 0,
      rain: 0,
      maximum: null,
    });
  });
});
