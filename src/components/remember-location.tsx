'use client';

import { useLayoutEffect } from 'react';
import { latestLocationCookie } from '../lib/weather';

export function RememberLocation({ locationId }: { locationId: number }) {
  useLayoutEffect(() => {
    // Prefetch can render a city out of view. Only the address bar counts.
    const pathname = window.location.pathname.replace(/\/$/, '') || '/';
    if (pathname !== `/weather/${locationId}`) return;
    document.cookie = latestLocationCookie(
      locationId,
      window.location.protocol === 'https:',
    );
  }, [locationId]);
  return null;
}
