import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { WeatherData } from '../../../components/weather-data';
import {
  WeatherLoading,
  WeatherShell,
} from '../../../components/weather-shell';
import { parseLocationId } from '../../../lib/weather';

async function CityWeather({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const id = parseLocationId((await params).locationId);
  if (id === null) notFound();
  return <WeatherData locationId={id} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  return (
    <WeatherShell>
      <Suspense fallback={<WeatherLoading />}>
        <CityWeather params={params} />
      </Suspense>
    </WeatherShell>
  );
}
