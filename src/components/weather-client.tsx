'use client';

import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Carousel } from '@astryxdesign/core/Carousel';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import {
  MetadataList,
  MetadataListItem,
} from '@astryxdesign/core/MetadataList';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Section } from '@astryxdesign/core/Section';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import type { DehydratedDbState } from '@tanstack/db';
import {
  HydrationBoundary,
  useDbClient,
  useLiveQuery,
} from '@tanstack/react-db';
import {
  ArrowDown,
  ArrowUp,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCw,
  Wind,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { forecastCollection, forecastQuery } from '../lib/collections';
import { dayLabel, temperature, type WeatherLocation } from '../lib/weather';
import { WeatherIcon } from './weather-icon';

export function WeatherClient({
  location,
  state,
}: {
  location: WeatherLocation;
  state: DehydratedDbState;
}) {
  return (
    <HydrationBoundary state={state}>
      <WeatherDashboard location={location} />
    </HydrationBoundary>
  );
}

function WeatherDashboard({ location }: { location: WeatherLocation }) {
  const db = useDbClient();
  const [descriptor] = useState(() => forecastCollection(location.id));
  const { data: forecasts } = useLiveQuery({
    query: forecastQuery(location.id),
  });
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [date, setDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [error, setError] = useState('');
  const selected = forecasts.find((row) => row.date === date) ?? forecasts[0];
  async function refresh() {
    setRefreshing(true);
    setError('');
    try {
      const collection = db.collection(descriptor);
      await collection.preload();
      await collection.utils.refetch({ throwOnError: true });
    } catch {
      setError(
        'We couldn’t update the forecast. Your last forecast is still here.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Stack as="section" gap={6} aria-label="Weather forecast">
      <Stack
        direction="horizontal"
        justify="between"
        align="center"
        gap={4}
        wrap="wrap"
      >
        <Stack gap={2}>
          <Text type="label" color="secondary">
            Your daily outlook
          </Text>
          <Heading level={1} type="display-2">
            {location.name},
          </Heading>
          <Text color="secondary">
            A good day starts with a little outlook.
          </Text>
        </Stack>
        <SegmentedControl
          label="Temperature unit"
          value={unit}
          onChange={(value) => {
            if (value === 'C' || value === 'F') setUnit(value);
          }}
          isDisabled={!hydrated}
        >
          <SegmentedControlItem value="C" label="°C" />
          <SegmentedControlItem value="F" label="°F" />
        </SegmentedControl>
      </Stack>

      {!selected ? (
        <EmptyState
          title="No forecast published yet."
          description="Try another location or check back soon."
          icon={<Icon icon={CloudSun} size="lg" />}
          actions={
            <Button
              label="Check again"
              onClick={() => void refresh()}
              isLoading={refreshing}
              isDisabled={!hydrated}
            />
          }
        />
      ) : (
        <>
          <Card variant="weather" padding={6} xstyle={styles.hero}>
            <Grid columns={{ minWidth: 240, max: 2 }} gap={6} align="center">
              <Stack gap={4}>
                <Stack
                  direction="horizontal"
                  align="center"
                  gap={3}
                  wrap="wrap"
                >
                  <Text type="label">{dayLabel(selected.date, 'long')}</Text>
                  <Text type="supporting" color="secondary">
                    Daily forecast
                  </Text>
                </Stack>
                <Text type="display-1" hasTabularNumbers>
                  {temperature(selected.maximum, unit)}
                  {unit}
                </Text>
                <Heading level={2}>{selected.condition}</Heading>
                <Stack direction="horizontal" gap={4} wrap="wrap">
                  <Stack
                    as="span"
                    direction="horizontal"
                    align="center"
                    gap={1}
                  >
                    <Icon icon={ArrowUp} size="sm" />
                    <Text>{temperature(selected.maximum, unit)} high</Text>
                  </Stack>
                  <Stack
                    as="span"
                    direction="horizontal"
                    align="center"
                    gap={1}
                  >
                    <Icon icon={ArrowDown} size="sm" />
                    <Text>{temperature(selected.minimum, unit)} low</Text>
                  </Stack>
                </Stack>
              </Stack>
              <Stack
                align="center"
                justify="center"
                minHeight={160}
                xstyle={styles.sky}
                aria-hidden="true"
              >
                <WeatherIcon code={selected.weatherCode} size="hero" />
              </Stack>
            </Grid>
          </Card>

          <Stack gap={4}>
            <Stack
              direction="horizontal"
              justify="between"
              align="center"
              gap={3}
              wrap="wrap"
            >
              <Heading level={2}>The days ahead</Heading>
              <Text type="supporting" color="secondary">
                {forecasts.length}-day forecast
              </Text>
            </Stack>
            <RadioList
              label="Forecast day"
              isLabelHidden
              value={selected.date}
              onChange={setDate}
            >
              <Carousel aria-label="Daily forecasts" gap={3} hasSnap>
                {forecasts.map((day) => (
                  <Card
                    key={day.id}
                    width={200}
                    height="100%"
                    variant={
                      day.id === selected.id ? 'forecast-selected' : 'default'
                    }
                  >
                    <RadioListItem
                      value={day.date}
                      align="first-line"
                      label={dayLabel(day.date, 'long')}
                      aria-label={`${dayLabel(day.date, 'long')}, ${day.condition}`}
                      description={
                        <Stack as="span" gap={4} paddingBlockStart={3}>
                          <Stack as="span" align="center" gap={3}>
                            <WeatherIcon code={day.weatherCode} />
                            <Text size="xl" hasTabularNumbers>
                              {temperature(day.maximum, unit)}{' '}
                              <Text color="secondary">
                                {temperature(day.minimum, unit)}
                              </Text>
                            </Text>
                            <Text type="supporting" color="secondary">
                              {day.condition}
                            </Text>
                          </Stack>
                          <Stack
                            as="span"
                            direction="horizontal"
                            align="center"
                            justify="center"
                            gap={1}
                          >
                            <Icon icon={Droplets} size="sm" />
                            <Text type="supporting">
                              {day.rain === null
                                ? '—'
                                : `${Math.round(day.rain)}%`}
                            </Text>
                          </Stack>
                        </Stack>
                      }
                    />
                  </Card>
                ))}
              </Carousel>
            </RadioList>
          </Stack>

          <Section
            dividers={['top', 'bottom']}
            paddingBlock={5}
            paddingInline={0}
          >
            <MetadataList columns="multi">
              <MetadataListItem
                label="Chance of rain"
                icon={<Icon icon={Droplets} size="md" />}
              >
                {selected.rain === null
                  ? 'Unavailable'
                  : `${Math.round(selected.rain)}%`}
              </MetadataListItem>
              <MetadataListItem
                label="Prevailing wind"
                icon={<Icon icon={Wind} size="md" />}
              >
                {selected.windDirection || 'Unavailable'}
              </MetadataListItem>
              <MetadataListItem
                label="Coordinates"
                icon={<Icon icon={MapPin} size="md" />}
              >
                {location.latitude != null && location.longitude != null
                  ? `${Math.abs(location.latitude).toFixed(2)}° ${location.latitude < 0 ? 'S' : 'N'} / ${Math.abs(location.longitude).toFixed(2)}° ${location.longitude < 0 ? 'W' : 'E'}`
                  : 'Unavailable'}
              </MetadataListItem>
            </MetadataList>
          </Section>
          <Stack gap={3}>
            <Stack
              direction="horizontal"
              justify="between"
              align="center"
              gap={4}
              wrap="wrap"
            >
              <StackItem size="fill">
                <Text as="p" type="supporting" color="secondary">
                  Daily highs & lows, in °{unit}.{' '}
                  {selected.updatedAt
                    ? `Source updated ${formatTime(selected.updatedAt)}.`
                    : 'Source update time unavailable.'}
                  <br />
                  {selected.fetchedAt
                    ? `Retrieved ${formatTime(selected.fetchedAt)}. `
                    : ''}
                  Forecasts refresh every 5 minutes.
                </Text>
              </StackItem>
              <Button
                label="Refresh"
                variant="ghost"
                size="sm"
                icon={<Icon icon={RefreshCw} size="sm" />}
                onClick={() => void refresh()}
                isLoading={refreshing}
                isDisabled={!hydrated}
              />
            </Stack>
            <Text as="p" type="supporting" color="secondary">
              {selected.attribution}
            </Text>
          </Stack>
        </>
      )}
      {error && <Banner status="warning" title={error} />}
    </Stack>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Lisbon',
    timeZoneName: 'short',
  }).format(new Date(value));
}

// Brand-specific artwork; layout, sizing, scrolling, and interaction belong
// to Astryx. Component overrides and shared colors live in tempoTheme.ts.
const styles = stylex.create({
  hero: {
    backgroundImage: 'var(--tempo-weather-glow)',
  },
  sky: {
    color: 'var(--tempo-weather-sky-color)',
    backgroundImage: 'var(--tempo-weather-orbits)',
  },
});
