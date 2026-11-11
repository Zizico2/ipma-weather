import { Suspense } from 'react';
import { WeatherData } from '../components/weather-data';
import { WeatherLoading } from '../components/weather-shell';
import { DEFAULT_LOCATION_ID } from '../lib/weather';

export default function Page() {
  return (
    <Suspense fallback={<WeatherLoading />}>
      <WeatherData locationId={DEFAULT_LOCATION_ID} />
    </Suspense>
  );
}
