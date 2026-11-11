import type { NextRequest } from 'next/server';
import { latestCityRedirect } from '../../server/latest-city-redirect';

export function GET(request: NextRequest) {
  return latestCityRedirect(request);
}

export function HEAD(request: NextRequest) {
  return latestCityRedirect(request);
}
