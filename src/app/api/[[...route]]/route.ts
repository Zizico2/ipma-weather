import { handle } from 'hono/vercel';
import { createWeatherApi } from '../../../server/api';
import { preferences } from '../../../server/preferences';
import { getForecast, getLocations } from '../../../server/weather';

const handler = handle(
  createWeatherApi({ getForecast, getLocations }, preferences),
);
export const GET = handler;
export const POST = handler;
export const DELETE = handler;
