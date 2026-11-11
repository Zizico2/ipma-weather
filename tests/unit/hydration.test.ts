import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';
import {
  createWeatherDb,
  forecastCollection,
  locationsCollection,
} from '../../src/lib/collections';
import { GetWeatherForecastResponseSchema } from '../../src/server/gen/ipma/proxy/v1/proxy_pb';
import { mapForecasts } from '../../src/server/mappers';
import { fixtureForecast } from '../fixtures/data';

describe('TanStack DB request isolation and hydration', () => {
  it('transfers collection snapshots into an independent client', async () => {
    const rows = mapForecasts(
      create(GetWeatherForecastResponseSchema, fixtureForecast(1110600)),
      [],
    );
    const loader = {
      locations: async () => [
        { id: 1110600, name: 'Lisboa', latitude: null, longitude: null },
      ],
      forecast: async () => rows,
    };
    const server = createWeatherDb(loader);
    const browser = createWeatherDb(loader);
    const otherRequest = createWeatherDb(loader);
    try {
      await Promise.all([
        server.db.collection(locationsCollection).preload(),
        server.db.collection(forecastCollection(1110600)).preload(),
      ]);
      browser.db.hydrate(JSON.parse(JSON.stringify(server.db.dehydrate())));
      expect(
        browser.db.collection(locationsCollection).get(1110600)?.name,
      ).toBe('Lisboa');
      expect(browser.db.collection(forecastCollection(1110600)).size).toBe(5);
      expect(otherRequest.db.collection(locationsCollection).size).toBe(0);
    } finally {
      await Promise.all([
        server.db.cleanup(),
        browser.db.cleanup(),
        otherRequest.db.cleanup(),
      ]);
      for (const scope of [server, browser, otherRequest])
        scope.queryClient.clear();
    }
  });
});
