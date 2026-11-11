import {
  type ClientRequestOptions,
  type ClientResponse,
  DetailedError,
  hc,
  parseResponse,
} from 'hono/client';
import type { WeatherLoader } from '../lib/collections';
// Type-only: the Hono app must stay on the server.
import type { WeatherApi } from '../server/api';

const unavailable = 'Weather is temporarily unavailable. Please try again.';

export function createWeatherClient(
  options?: ClientRequestOptions,
): WeatherLoader {
  const rpc = hc<WeatherApi>('/', options);
  return {
    locations: (signal) =>
      call(rpc.api.locations.$get(undefined, { init: { signal } })),
    forecast: (id, signal) =>
      call(
        rpc.api.forecasts[':id'].$get(
          { param: { id: String(id) } },
          { init: { signal } },
        ),
      ),
  };
}

function call<T extends ClientResponse<unknown>>(pending: Promise<T>) {
  return parseResponse(pending).catch((error: unknown) => {
    if (error instanceof DetailedError) throw new Error(unavailable);
    throw error;
  });
}

export const weatherClient = createWeatherClient();
