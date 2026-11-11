import { type NextRequest, NextResponse } from 'next/server';
import { LATEST_LOCATION_COOKIE, latestLocationId } from '../lib/weather';

export function latestCityRedirect(request: NextRequest) {
  const id = latestLocationId(
    request.cookies.get(LATEST_LOCATION_COOKIE)?.value,
  );
  // A relative Location keeps the visitor on the host they actually used.
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: `/weather/${id}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
