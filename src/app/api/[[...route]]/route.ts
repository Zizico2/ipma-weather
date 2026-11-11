import { handle } from 'hono/vercel';
import { createWeatherApi } from '../../../server/api';
import { getForecast, getLocations } from '../../../server/weather';

export const GET = handle(createWeatherApi({ getForecast, getLocations }));
