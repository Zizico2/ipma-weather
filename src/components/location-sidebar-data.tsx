import { cacheLife } from 'next/cache';
import { getLocations } from '../server/weather';
import { LocationSidebar } from './location-sidebar';

export async function LocationSidebarData() {
  'use cache';
  cacheLife({ stale: 3600, revalidate: 86400, expire: 172800 });
  return <LocationSidebar locations={await getLocations()} />;
}
