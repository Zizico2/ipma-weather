'use client';

import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Stack } from '@astryxdesign/core/Stack';
import { Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import type { DehydratedDbState } from '@tanstack/db';
import {
  HydrationBoundary,
  useDbClient,
  useLiveQuery,
} from '@tanstack/react-db';
import { useContext, useEffect, useState } from 'react';
import {
  hourlyForecastCollection,
  hourlyForecastQuery,
} from '../lib/collections';
import {
  type HourlyForecast,
  localDate,
  locationTimeZone,
  selectHourlyForecasts,
  temperature,
} from '../lib/weather';
import { TemperatureUnitContext } from './temperature-unit';
import { WeatherIcon } from './weather-icon';

export function HourlyLoading() {
  return (
    <Stack gap={3} aria-busy="true" aria-label="Loading hourly forecast">
      <Heading level={2}>Hour by hour</Heading>
      <Skeleton height={180} />
    </Stack>
  );
}

export function HourlyForecastClient({
  locationId,
  state,
  now,
}: {
  locationId: number;
  state?: DehydratedDbState;
  now: number;
}) {
  const content = (
    <HourlyOutlook
      locationId={locationId}
      now={now}
      initialUnavailable={!state}
    />
  );
  return state ? (
    <HydrationBoundary state={state}>{content}</HydrationBoundary>
  ) : (
    content
  );
}

function HourlyOutlook({
  locationId,
  now: initialNow,
  initialUnavailable,
}: {
  locationId: number;
  now: number;
  initialUnavailable: boolean;
}) {
  const preferredUnit = useContext(TemperatureUnitContext);
  const db = useDbClient();
  const [descriptor] = useState(() => hourlyForecastCollection(locationId));
  const {
    data: forecasts,
    collection: liveQuery,
    status,
    isReady,
  } = useLiveQuery({ query: hourlyForecastQuery(locationId) });
  const [view, setView] = useState<'next' | 'today'>('next');
  const [now, setNow] = useState(initialNow);
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  // This section can hydrate after the parent unit control is already usable.
  // Match its server-rendered Celsius markup before following live context.
  const unit = hydrated ? preferredUnit : 'C';
  useEffect(() => {
    setHydrated(true);
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const timeZone = locationTimeZone(locationId);
  const rows = selectHourlyForecasts(forecasts, view, now, timeZone);
  const unavailable =
    status === 'error' ||
    status === 'crashed' ||
    (initialUnavailable && !isReady);
  const meta = forecasts[0];
  async function refresh() {
    setRefreshing(true);
    setRefreshError(false);
    try {
      const collection = db.collection(descriptor);
      if (unavailable) await liveQuery.reload();
      else await collection.utils.refetch({ throwOnError: true });
      setNow(Date.now());
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <Stack as="section" gap={4} aria-label="Hourly forecast">
      <Stack
        direction="horizontal"
        justify="between"
        align="center"
        gap={3}
        wrap="wrap"
      >
        <Heading level={2}>Hour by hour</Heading>
        <SegmentedControl
          label="Hourly forecast window"
          value={view}
          isDisabled={!hydrated}
          onChange={(value) => {
            if (value === 'next' || value === 'today') setView(value);
          }}
        >
          <SegmentedControlItem value="next" label="Next 10 hours" />
          <SegmentedControlItem value="today" label="Today" />
        </SegmentedControl>
      </Stack>
      {rows.length ? (
        <>
          <TemperatureCurve rows={rows} unit={unit} />
          <Table
            aria-label="Hourly forecasts"
            density="compact"
            data={rows}
            idKey="id"
            columns={[
              {
                key: 'forecastAt',
                header: 'Local time',
                renderCell: (row) => (
                  <Stack gap={1}>
                    <Text type="label">
                      {new Intl.DateTimeFormat('en-GB', {
                        timeZone,
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short',
                      }).format(new Date(row.forecastAt))}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {new Intl.DateTimeFormat('en-GB', {
                        timeZone,
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(row.forecastAt))}
                      {localDate(row.forecastAt, timeZone) !==
                      localDate(now, timeZone)
                        ? ' · Tomorrow'
                        : ''}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: 'temperature',
                header: `Temp °${unit}`,
                renderCell: (row) => (
                  <Text hasTabularNumbers>
                    {temperature(row.temperature, unit)}
                  </Text>
                ),
              },
              {
                key: 'condition',
                header: 'Conditions',
                renderCell: (row) => (
                  <Stack direction="horizontal" gap={2} align="center">
                    <WeatherIcon code={row.weatherCode} />
                    <Text type="supporting">{row.condition}</Text>
                  </Stack>
                ),
              },
              {
                key: 'rainProbability',
                header: 'Rain (3h)',
                renderCell: (row) =>
                  row.rainProbability === null
                    ? '—'
                    : `${Math.round(row.rainProbability)}%`,
              },
              {
                key: 'windSpeed',
                header: 'Wind km/h',
                renderCell: (row) =>
                  row.windSpeed === null
                    ? '—'
                    : `${Math.round(row.windSpeed)} ${row.windDirection}`,
              },
            ]}
          />
        </>
      ) : (
        <EmptyState
          title={
            unavailable
              ? 'Hourly forecast is temporarily unavailable.'
              : 'No hourly forecast published for this window.'
          }
          description={
            unavailable
              ? 'You can still explore the daily forecast below.'
              : 'Only published one-hour forecasts are shown; gaps are left empty.'
          }
        />
      )}
      {(refreshError || (unavailable && forecasts.length > 0)) && (
        <Banner
          status="warning"
          title="We couldn’t update the hourly forecast. Your last forecast is still here."
        />
      )}
      <Stack
        direction="horizontal"
        justify="between"
        align="center"
        gap={3}
        wrap="wrap"
      >
        <Text as="p" type="supporting" color="secondary">
          Times in {timeZone}. Rain is the chance of ≥0.3 mm in the preceding 3
          hours.
          {meta?.updatedAt
            ? ` Source updated ${formatTime(meta.updatedAt, timeZone)}.`
            : ''}
          {meta?.fetchedAt
            ? ` Retrieved ${formatTime(meta.fetchedAt, timeZone)}.`
            : ''}
          {meta ? ` ${meta.attribution}.` : ''} Source: IPMA website feed.
        </Text>
        <Button
          label="Refresh hourly"
          size="sm"
          variant="ghost"
          isDisabled={!hydrated}
          isLoading={refreshing}
          onClick={() => void refresh()}
        />
      </Stack>
    </Stack>
  );
}

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}

function TemperatureCurve({
  rows,
  unit,
}: {
  rows: HourlyForecast[];
  unit: 'C' | 'F';
}) {
  const values = rows.flatMap((row) =>
    row.temperature === null ? [] : [row.temperature],
  );
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(1, Math.max(...values) - min);
  const start = Date.parse(rows[0].forecastAt);
  const span = Math.max(
    3_600_000,
    Date.parse(rows[rows.length - 1].forecastAt) - start,
  );
  const point = (row: HourlyForecast) => ({
    x: 10 + ((Date.parse(row.forecastAt) - start) / span) * 780,
    y: 65 - (((row.temperature ?? min) - min) / range) * 50,
  });
  return (
    <Stack as="figure" gap={1}>
      <Text type="supporting" color="secondary">
        Temperature · {temperature(min, unit)} to{' '}
        {temperature(Math.max(...values), unit)}
      </Text>
      <svg
        viewBox="0 0 800 80"
        width="100%"
        height="80"
        role="img"
        aria-label="Hourly temperature trend; exact values in the table below"
      >
        {rows.map((row, i) => {
          if (row.temperature === null) return null;
          const p = point(row);
          const previous = rows[i - 1];
          const before = previous && point(previous);
          return (
            <g key={row.id}>
              {previous?.temperature != null &&
                Date.parse(row.forecastAt) - Date.parse(previous.forecastAt) ===
                  3_600_000 && (
                  <line
                    x1={before.x}
                    y1={before.y}
                    x2={p.x}
                    y2={p.y}
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                )}
              <circle cx={p.x} cy={p.y} r="3" fill="currentColor" />
            </g>
          );
        })}
      </svg>
    </Stack>
  );
}
