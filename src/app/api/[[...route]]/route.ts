import { handle } from '@hono/vercel';
import { createWeatherApi } from '../../../server/api';
import {
  getForecast,
  getHourlyForecast,
  getLocations,
} from '../../../server/weather';

export const GET = handle(
  createWeatherApi({ getForecast, getHourlyForecast, getLocations }),
);
