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
                      <Stack
                        width="100%"
                        height={56}
                        xstyle={styles.curveSlot}
                        aria-hidden="true"
                      >
                        {index === 0 && (
                          <TemperatureCurve
                            rows={rows}
                            minimum={minimum}
                            range={range}
                          />
                        )}
                      </Stack>
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

// Paint the entire trace in one SVG. Separate SVGs produce antialiased seams
// at fractional tile widths. Missing measurements or hours still break the path.
function TemperatureCurve({
  rows,
  minimum,
  range,
}: {
  rows: HourlyForecast[];
  minimum: number;
  range: number;
}) {
  const segments: { x: number; y: number; id: string }[][] = [];
  for (const [index, row] of rows.entries()) {
    if (row.temperature === null) continue;
    const previous = rows[index - 1];
    if (
      !previous ||
      previous.temperature === null ||
      Date.parse(row.forecastAt) - Date.parse(previous.forecastAt) !== 3_600_000
    ) {
      segments.push([]);
    }
    segments[segments.length - 1].push({
      x: index * 100 + 50,
      y: 48 - ((row.temperature - minimum) / range) * 32,
      id: row.id,
    });
  }
  return (
    <svg
      viewBox={`0 0 ${rows.length * 100} 64`}
      preserveAspectRatio="none"
      width={`${rows.length * 100}%`}
      height="56"
      aria-hidden="true"
      focusable="false"
      {...stylex.props(styles.curve)}
    >
      {segments.map((points) => {
        const first = points[0];
        const last = points[points.length - 1];
        const path = points
          .map((point, index) =>
            index === 0
              ? `M${point.x} ${point.y}`
              : `C${point.x - 70} ${points[index - 1].y} ${point.x - 30} ${point.y} ${point.x} ${point.y}`,
          )
          .join(' ');
        return (
          <g key={first.id}>
            <path
              d={`${path} L${last.x} 64 L${first.x} 64 Z`}
              fill="var(--tempo-hour-fill)"
            />
            <path
              d={path}
              fill="none"
              stroke="var(--tempo-hour-line)"
              strokeWidth="2.5"
            />
            {points.map((point) => (
              <circle
                key={point.id}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="var(--tempo-hour-line)"
              />
            ))}
          </g>
        );
      })}
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
  curveSlot: { position: 'relative', flexShrink: 0 },
  curve: {
    position: 'absolute',
    insetInlineStart: 0,
    top: 0,
    zIndex: 1,
    pointerEvents: 'none',
  },
  details: {
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'var(--color-border)',
  },
});
