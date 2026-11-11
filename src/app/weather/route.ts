import { type NextRequest, NextResponse } from 'next/server';
import { LATEST_LOCATION_COOKIE, latestLocationId } from '../../lib/weather';

function latestCityRedirect(request: NextRequest) {
  const id = latestLocationId(
    request.cookies.get(LATEST_LOCATION_COOKIE)?.value,
  );
  // A relative Location keeps the visitor on the host they actually used.
  const response = new NextResponse(null, {
    status: 307,
    headers: {
      Location: `/weather/${id}`,
      'Cache-Control': 'private, no-store',
    },
  });
  return response;
}

export function GET(request: NextRequest) {
  return latestCityRedirect(request);
}

export function HEAD(request: NextRequest) {
  return latestCityRedirect(request);
}
