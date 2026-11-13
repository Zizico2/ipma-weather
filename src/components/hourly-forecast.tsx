'use client';

import { Banner } from '@astryxdesign/core/Banner';
import { Carousel } from '@astryxdesign/core/Carousel';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { useSnapPaging } from '@astryxdesign/core/SnapPaging';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import type { DehydratedDbState } from '@tanstack/db';
import {
  HydrationBoundary,
  useDbClient,
  useLiveQuery,
} from '@tanstack/react-db';
import { Clock3, Droplets, RefreshCw, Wind } from 'lucide-react';
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
      <Skeleton height={240} />
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
  const snapPaging = useSnapPaging();
  const db = useDbClient();
  const [descriptor] = useState(() => hourlyForecastCollection(locationId));
  const {
    data: forecasts,
    collection: liveQuery,
    status,
    isReady,
  } = useLiveQuery({ query: hourlyForecastQuery(locationId) });
  const [view, setView] = useState<'next' | 'today'>('next');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(initialNow);
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  // A user can switch units while this independent section is still hydrating.
  const unit = hydrated ? preferredUnit : 'C';
  useEffect(() => {
    setHydrated(true);
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const timeZone = locationTimeZone(locationId);
  const rows = selectHourlyForecasts(forecasts, view, now, timeZone);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const unavailable =
    status === 'error' ||
    status === 'crashed' ||
    (initialUnavailable && !isReady);
  const meta = selected ?? forecasts[0];
  const hourFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
  const fullFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const values = rows.flatMap((row) =>
    row.temperature === null ? [] : [row.temperature],
  );
  const minimum = values.length ? Math.min(...values) : 0;
  const range = values.length ? Math.max(4, Math.max(...values) - minimum) : 4;

  async function refresh() {
    setRefreshing(true);
    setRefreshError(false);
    try {
      if (unavailable) await liveQuery.reload();
      else
        await db.collection(descriptor).utils.refetch({ throwOnError: true });
      setNow(Date.now());
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Stack as="section" gap={3} aria-label="Hourly forecast">
      <Stack
        direction="horizontal"
        justify="between"
        align="center"
        gap={3}
        wrap="wrap"
      >
        <Stack direction="horizontal" gap={2} align="center">
          <Icon icon={Clock3} size="sm" />
          <Heading level={2}>Hour by hour</Heading>
        </Stack>
        <SegmentedControl
          label="Hourly forecast window"
          size="md"
          value={view}
          isDisabled={!hydrated}
          onChange={(value) => {
            if (value !== 'next' && value !== 'today') return;
            setView(value);
            setSelectedId(null);
          }}
        >
          <SegmentedControlItem value="next" label="Next 10 hours" />
          <SegmentedControlItem value="today" label="Today" />
        </SegmentedControl>
      </Stack>
      {selected ? (
        <Stack gap={0} xstyle={styles.surface}>
          <Stack padding={1}>
            <Carousel
              key={view}
              aria-label="Hourly forecasts"
              gap={0}
              hasSnap={snapPaging}
              hasEdgeFade={false}
            >
              {rows.map((row, index) => {
                const date = new Date(row.forecastAt);
                const day = localDate(row.forecastAt, timeZone);
                const previousDay = index
                  ? localDate(rows[index - 1].forecastAt, timeZone)
                  : null;
                const dayLabel =
                  day === localDate(now, timeZone) ? 'Today' : 'Tomorrow';
                return (
                  <button
                    key={row.id}
                    type="button"
                    {...stylex.props(
                      styles.hour,
                      row.id === selected.id && styles.selectedHour,
                    )}
                    aria-label={`${fullFormat.format(date)}, ${row.condition}, ${temperature(row.temperature, unit)}${unit}`}
                    aria-pressed={row.id === selected.id}
                    disabled={!hydrated}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <Stack gap={2} align="center" paddingBlock={3}>
                      <Text type="supporting" color="secondary">
                        {day !== previousDay ? dayLabel : ' '}
                      </Text>
                      <Text type="label" hasTabularNumbers>
                        {hourFormat.format(date)}
                      </Text>
                      <Stack xstyle={styles.weatherIcon}>
                        <WeatherIcon code={row.weatherCode} />
                      </Stack>
                      <Text size="xl" weight="semibold" hasTabularNumbers>
                        {temperature(row.temperature, unit)}
                      </Text>
                      <HourCurve
                        row={row}
                        previous={rows[index - 1]}
                        next={rows[index + 1]}
                        minimum={minimum}
                        range={range}
                      />
                      <Stack
                        direction="horizontal"
                        align="center"
                        gap={1}
                        xstyle={styles.rain}
                      >
                        <Icon icon={Droplets} size="xsm" />
                        <Text type="supporting" hasTabularNumbers>
                          {row.rainProbability === null
                            ? '—'
                            : `${Math.round(row.rainProbability)}%`}
                        </Text>
                      </Stack>
                    </Stack>
                  </button>
                );
              })}
            </Carousel>
          </Stack>
          <Stack
            padding={3}
            gap={2}
            xstyle={styles.details}
            aria-label="Selected hour details"
            aria-live="polite"
          >
            <Stack
              direction="horizontal"
              gap={2}
              align="center"
              wrap="wrap"
              justify="between"
            >
              <Text type="label">
                {hourFormat.format(new Date(selected.forecastAt))} ·{' '}
                {selected.condition}
              </Text>
              <Stack direction="horizontal" align="center" gap={3} wrap="wrap">
                <Stack direction="horizontal" gap={1} align="center">
                  <Icon icon={Wind} size="sm" />
                  <Text type="supporting">
                    {selected.windSpeed === null
                      ? 'Wind unavailable'
                      : `${Math.round(selected.windSpeed)} km/h ${selected.windDirection}`}
                  </Text>
                </Stack>
                <Text type="supporting" color="secondary">
                  {selected.humidity === null
                    ? 'Humidity unavailable'
                    : `${Math.round(selected.humidity)}% humidity`}
                </Text>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      ) : (
        <EmptyState
          title={
            unavailable
              ? 'Hourly forecast is temporarily unavailable.'
              : 'No hourly forecast published for this window.'
          }
          description={
            unavailable
              ? 'Your daily forecast is still available above.'
              : 'Only published one-hour forecasts are shown; gaps are left empty.'
          }
        />
      )}
      {(refreshError || (unavailable && forecasts.length > 0)) && (
        <Banner
          status="warning"
          title={
            forecasts.length
              ? 'We couldn’t update the hourly forecast. Your last forecast is still here.'
              : 'We couldn’t update the hourly forecast. Please try again.'
          }
        />
      )}
      <Stack direction="horizontal" justify="between" align="center" gap={2}>
        <Text type="supporting" color="secondary">
          Rain chance · preceding 3 hours
        </Text>
        <IconButton
          label="Refresh hourly"
          tooltip="Refresh hourly forecast"
          variant="ghost"
          size="lg"
          icon={<Icon icon={RefreshCw} size="sm" />}
          isDisabled={!hydrated}
          isLoading={refreshing}
          onClick={() => void refresh()}
        />
      </Stack>
      <Collapsible
        defaultIsOpen={false}
        trigger={
          <Text type="supporting" color="secondary">
            Source & details
          </Text>
        }
      >
        <Text as="p" type="supporting" color="secondary">
          Times in {timeZone}. Rain is the chance of ≥0.3 mm in the preceding 3
          hours.
          {meta?.updatedAt
            ? ` Source updated ${fullFormat.format(new Date(meta.updatedAt))}.`
            : ''}
          {meta?.fetchedAt
            ? ` Retrieved ${fullFormat.format(new Date(meta.fetchedAt))}.`
            : ''}
          {meta ? ` ${meta.attribution}.` : ''} Source: IPMA website feed.
        </Text>
      </Collapsible>
    </Stack>
  );
}

// Each slice shares its neighbours' edge coordinates, making one continuous
// temperature trace as the hours scroll. Missing hours/values break the trace.
function HourCurve({
  row,
  previous,
  next,
  minimum,
  range,
}: {
  row: HourlyForecast;
  previous?: HourlyForecast;
  next?: HourlyForecast;
  minimum: number;
  range: number;
}) {
  const y = (value: number) => 48 - ((value - minimum) / range) * 32;
  const connected = (other: HourlyForecast | undefined) =>
    other?.temperature != null &&
    Math.abs(Date.parse(other.forecastAt) - Date.parse(row.forecastAt)) ===
      3_600_000;
  const current = row.temperature === null ? null : y(row.temperature);
  const left =
    current !== null && connected(previous)
      ? (y(previous!.temperature!) + current) / 2
      : null;
  const right =
    current !== null && connected(next)
      ? (y(next!.temperature!) + current) / 2
      : null;
  const start = left === null ? 50 : 0;
  const end = right === null ? 50 : 100;
  const path =
    current === null
      ? ''
      : `${left === null ? `M50 ${current}` : `M0 ${left} C20 ${left} 30 ${current} 50 ${current}`} ${right === null ? '' : `C70 ${current} 80 ${right} 100 ${right}`}`;
  return (
    <svg
      viewBox="0 0 100 64"
      preserveAspectRatio="none"
      width="100%"
      height="56"
      aria-hidden="true"
      focusable="false"
      {...stylex.props(styles.curve)}
    >
      {current !== null && (
        <>
          <path
            d={`${path} L${end} 64 L${start} 64 Z`}
            fill="var(--tempo-hour-fill)"
          />
          <path
            d={path}
            fill="none"
            stroke="var(--tempo-hour-line)"
            strokeWidth="2.5"
          />
          <circle cx="50" cy={current} r="3" fill="var(--tempo-hour-line)" />
        </>
      )}
    </svg>
  );
}

const styles = stylex.create({
  surface: {
    containerType: 'inline-size',
    backgroundColor: 'var(--color-background-card)',
    borderRadius: 'var(--radius-container)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--color-border)',
    overflow: 'hidden',
  },
  hour: {
    width:
      'max(var(--tempo-hour-width), calc((100cqi - 2 * var(--spacing-1)) / 10))',
    flexShrink: 0,
    padding: 0,
    appearance: 'none',
    borderWidth: 0,
    borderRadius: 'var(--radius-element)',
    backgroundColor: {
      default: 'transparent',
      ':hover': 'var(--color-overlay-hover)',
    },
    color: 'var(--color-text-primary)',
    fontFamily: 'inherit',
    cursor: 'pointer',
    outlineOffset: 'calc(-1 * var(--spacing-1))',
    outlineColor: 'var(--focus-outline-color)',
    ':focus-visible': { outlineStyle: 'solid', outlineWidth: 2 },
  },
  selectedHour: {
    backgroundColor: {
      default: 'var(--color-accent-muted)',
      ':hover': 'var(--color-accent-muted)',
    },
  },
  weatherIcon: { color: 'var(--tempo-hour-line)' },
  rain: { color: 'var(--tempo-hour-rain)' },
  curve: { display: 'block', flexShrink: 0 },
  details: {
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'var(--color-border)',
  },
});
