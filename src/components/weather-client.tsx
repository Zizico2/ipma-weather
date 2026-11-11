'use client';

import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import * as stylex from '@stylexjs/stylex';
import type { DehydratedDbState } from '@tanstack/db';
import {
  DbProvider,
  HydrationBoundary,
  useDbClient,
  useLiveQuery,
} from '@tanstack/react-db';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Droplets,
  MapPin,
  RefreshCw,
  Star,
  Wind,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  createWeatherDb,
  forecastCollection,
  locationsCollection,
} from '../lib/collections';
import { httpLoader, savedPlacesHttpLoader } from '../lib/http';
import { savedPlacesCollection } from '../lib/saved-places-collection';
import type { WeatherLocation } from '../lib/weather';
import { dayLabel, temperature } from '../lib/weather';
import { WeatherIcon } from './weather-icon';

export function WeatherClient({
  locationId,
  state,
}: {
  locationId: number;
  state: DehydratedDbState;
}) {
  const [scope] = useState(() =>
    createWeatherDb(httpLoader, savedPlacesHttpLoader),
  );
  const cleanup = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(cleanup.current);
    return () => {
      // Delay teardown across Strict Mode's immediate effect replay.
      cleanup.current = setTimeout(() => {
        void scope.db.cleanup();
        scope.queryClient.clear();
      }, 0);
    };
  }, [scope]);
  return (
    <DbProvider client={scope.db}>
      <HydrationBoundary state={state}>
        <WeatherDashboard locationId={locationId} />
      </HydrationBoundary>
    </DbProvider>
  );
}

function WeatherDashboard({ locationId }: { locationId: number }) {
  const db = useDbClient();
  const [descriptor] = useState(() => forecastCollection(locationId));
  const { data: locations } = useLiveQuery({
    query: (q) =>
      q
        .from({ location: locationsCollection })
        .orderBy(({ location }) => location.name, 'asc'),
  });
  const { data: forecasts } = useLiveQuery({
    query: (q) =>
      q
        .from({ forecast: descriptor })
        .orderBy(({ forecast }) => forecast.date, 'asc'),
  });
  const [search, setSearch] = useState('');
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [date, setDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [error, setError] = useState('');
  const location = locations.find((row) => row.id === locationId);
  const selected = forecasts.find((row) => row.date === date) ?? forecasts[0];
  const filtered = locations.filter((row) =>
    row.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes(
        search
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase(),
      ),
  );

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
    <main id="forecast" {...stylex.props(styles.layout)}>
      <aside {...stylex.props(styles.sidebar)} aria-label="Locations">
        <p {...stylex.props(styles.eyebrow)}>FIND YOUR FORECAST</p>
        <h2 {...stylex.props(styles.sidebarTitle)}>
          Somewhere
          <br />
          in Portugal.
        </h2>
        <TextInput
          label="Search locations"
          value={search}
          onChange={setSearch}
          placeholder="Search a city…"
          type="search"
          hasClear
        />
        <SavedPlaces locationId={locationId} locations={locations} />
        <p {...stylex.props(styles.listLabel)}>
          {search ? `${filtered.length} PLACES FOUND` : 'EXPLORE LOCATIONS'}
        </p>
        <nav {...stylex.props(styles.locations)} aria-label="Choose a location">
          {filtered.map((city) => (
            <Link
              key={city.id}
              href={`/weather/${city.id}`}
              aria-current={city.id === locationId ? 'page' : undefined}
              {...stylex.props(
                styles.location,
                city.id === locationId && styles.locationActive,
              )}
            >
              <span>{city.name}</span>
              {city.id === locationId ? (
                <MapPin size={15} aria-hidden="true" />
              ) : (
                <ArrowUpRight size={14} aria-hidden="true" />
              )}
            </Link>
          ))}
          {filtered.length === 0 && (
            <p {...stylex.props(styles.muted)}>
              No locations found. Try another name.
            </p>
          )}
        </nav>
        <div {...stylex.props(styles.sidebarFoot)}>
          <span {...stylex.props(styles.greenDot)} /> Mainland & islands
          <br />
          <span {...stylex.props(styles.muted)}>
            One country. Many kinds of weather.
          </span>
        </div>
      </aside>

      <section {...stylex.props(styles.content)} aria-label="Weather forecast">
        <div {...stylex.props(styles.titleRow)}>
          <div>
            <p {...stylex.props(styles.eyebrow)}>YOUR DAILY OUTLOOK</p>
            <h1 {...stylex.props(styles.title)}>
              {location?.name ?? 'Portugal'}
              <span {...stylex.props(styles.comma)}>,</span>
            </h1>
            <p {...stylex.props(styles.subtitle)}>
              A good day starts with a little outlook.
            </p>
          </div>
          <fieldset
            {...stylex.props(styles.units)}
            aria-label="Temperature unit"
          >
            {(['C', 'F'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setUnit(value)}
                aria-pressed={unit === value}
                {...stylex.props(
                  styles.unit,
                  unit === value && styles.unitActive,
                )}
              >
                °{value}
              </button>
            ))}
          </fieldset>
        </div>

        {!selected ? (
          <div {...stylex.props(styles.empty)} role="status">
            <h2>No forecast published yet.</h2>
            <p>Try another location or check back soon.</p>
            <Button
              label="Check again"
              onClick={() => void refresh()}
              isLoading={refreshing}
              isDisabled={!hydrated}
            />
          </div>
        ) : (
          <>
            <div {...stylex.props(styles.hero)}>
              <div {...stylex.props(styles.heroCopy)}>
                <p {...stylex.props(styles.heroLabel)}>
                  {dayLabel(selected.date, 'long')}{' '}
                  <span {...stylex.props(styles.heroPill)}>DAILY FORECAST</span>
                </p>
                <div {...stylex.props(styles.heroTemp)}>
                  {temperature(selected.maximum, unit)}
                  <span {...stylex.props(styles.heroUnit)}>{unit}</span>
                </div>
                <p {...stylex.props(styles.condition)}>{selected.condition}</p>
                <div {...stylex.props(styles.highLow)}>
                  <span {...stylex.props(styles.highLowItem)}>
                    <ArrowUp size={14} aria-hidden="true" />{' '}
                    {temperature(selected.maximum, unit)} high
                  </span>
                  <span {...stylex.props(styles.highLowItem)}>
                    <ArrowDown size={14} aria-hidden="true" />{' '}
                    {temperature(selected.minimum, unit)} low
                  </span>
                </div>
              </div>
              <div {...stylex.props(styles.sky)} aria-hidden="true">
                <div {...stylex.props(styles.orbit)} />
                <div {...stylex.props(styles.orbitSmall)} />
                <div {...stylex.props(styles.sun)} />
                <div {...stylex.props(styles.heroIcon)}>
                  <WeatherIcon code={selected.weatherCode} size={90} />
                </div>
                <span {...stylex.props(styles.skyCaption)}>
                  A WINDOW TO THE WEATHER
                </span>
              </div>
            </div>

            <div {...stylex.props(styles.sectionHeading)}>
              <h2 {...stylex.props(styles.sectionTitle)}>The days ahead</h2>
              <span {...stylex.props(styles.muted)}>
                {forecasts.length}-day forecast
              </span>
            </div>
            <div {...stylex.props(styles.forecastGrid)}>
              {forecasts.map((day) => (
                <button
                  type="button"
                  key={day.id}
                  aria-pressed={day.id === selected.id}
                  onClick={() => setDate(day.date)}
                  aria-label={`${dayLabel(day.date, 'long')}, ${day.condition}`}
                  {...stylex.props(
                    styles.day,
                    day.id === selected.id && styles.dayActive,
                  )}
                >
                  <span {...stylex.props(styles.dayName)}>
                    {dayLabel(day.date).split(' ')[0]}
                  </span>
                  <span {...stylex.props(styles.dayDate)}>
                    {dayLabel(day.date).split(' ').slice(1).join(' ')}
                  </span>
                  <div {...stylex.props(styles.dayIcon)}>
                    <WeatherIcon code={day.weatherCode} />
                  </div>
                  <span {...stylex.props(styles.dayTemps)}>
                    {temperature(day.maximum, unit)}{' '}
                    <span {...stylex.props(styles.lowTemp)}>
                      {temperature(day.minimum, unit)}
                    </span>
                  </span>
                  <span {...stylex.props(styles.rain)}>
                    <Droplets size={12} aria-hidden="true" />
                    {day.rain === null ? '—' : `${Math.round(day.rain)}%`}
                  </span>
                </button>
              ))}
            </div>

            <div {...stylex.props(styles.details)}>
              <div {...stylex.props(styles.detail)}>
                <Droplets size={21} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p {...stylex.props(styles.detailLabel)}>CHANCE OF RAIN</p>
                  <p {...stylex.props(styles.detailValue)}>
                    {selected.rain === null
                      ? 'Unavailable'
                      : `${Math.round(selected.rain)}%`}
                  </p>
                </div>
              </div>
              <div {...stylex.props(styles.detail)}>
                <Wind size={22} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p {...stylex.props(styles.detailLabel)}>PREVAILING WIND</p>
                  <p {...stylex.props(styles.detailValue)}>
                    {selected.windDirection || 'Unavailable'}
                  </p>
                </div>
              </div>
              <div {...stylex.props(styles.detail)}>
                <MapPin size={21} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <p {...stylex.props(styles.detailLabel)}>COORDINATES</p>
                  <p {...stylex.props(styles.coordinate)}>
                    {location?.latitude != null && location.longitude != null
                      ? `${Math.abs(location.latitude).toFixed(2)}° ${location.latitude < 0 ? 'S' : 'N'} / ${Math.abs(location.longitude).toFixed(2)}° ${location.longitude < 0 ? 'W' : 'E'}`
                      : 'Unavailable'}
                  </p>
                </div>
              </div>
            </div>
            <div {...stylex.props(styles.freshness)}>
              <p {...stylex.props(styles.freshnessText)}>
                Daily highs & lows, in °{unit}.{' '}
                {selected.updatedAt
                  ? `Source updated ${formatTime(selected.updatedAt)}.`
                  : 'Source update time unavailable.'}
                <br />
                {selected.fetchedAt
                  ? `Retrieved ${formatTime(selected.fetchedAt)}. `
                  : ''}
                Shared forecast cache · 5-minute revalidation.
              </p>
              <Button
                label="Refresh"
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={14} aria-hidden="true" />}
                onClick={() => void refresh()}
                isLoading={refreshing}
                isDisabled={!hydrated}
              />
            </div>
            <p {...stylex.props(styles.attribution)}>{selected.attribution}</p>
          </>
        )}
        <div role="status" aria-live="polite">
          {error && <p {...stylex.props(styles.error)}>{error}</p>}
        </div>
      </section>
    </main>
  );
}

function SavedPlaces({
  locationId,
  locations,
}: {
  locationId: number;
  locations: WeatherLocation[];
}) {
  const db = useDbClient();
  const {
    data: savedPlaces,
    isReady,
    isLoadingError,
  } = useLiveQuery({
    query: (q) => q.from({ place: savedPlacesCollection }),
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const saved = savedPlaces.some((place) => place.id === locationId);
  async function toggle() {
    setError('');
    setPending(true);
    try {
      const collection = db.collection(savedPlacesCollection);
      // These operations immediately update every live query. TanStack owns
      // the optimistic layer, confirmation and rollback; no mirrored React list.
      const transaction = saved
        ? collection.delete(locationId)
        : collection.insert({ id: locationId });
      await transaction.when('settled');
    } catch {
      setError('Couldn’t save your places. The change was rolled back.');
    } finally {
      setPending(false);
    }
  }
  async function retry() {
    setError('');
    try {
      await db
        .collection(savedPlacesCollection)
        .utils.refetch({ throwOnError: true });
    } catch {
      setError('Saved places are unavailable. Please try again.');
    }
  }
  return (
    <div {...stylex.props(styles.savedPlaces)}>
      <Button
        label={saved ? 'Remove saved place' : 'Save this place'}
        aria-pressed={saved}
        variant="ghost"
        size="sm"
        icon={
          <Star
            size={15}
            fill={saved ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        }
        onClick={() => void toggle()}
        isDisabled={!isReady || pending}
      >
        {saved ? 'Saved' : 'Save place'}
      </Button>
      {pending && (
        <p {...stylex.props(styles.muted)} role="status">
          Saving…
        </p>
      )}
      {savedPlaces.length > 0 && (
        <nav aria-label="Saved places" {...stylex.props(styles.savedList)}>
          {savedPlaces.map((place) => {
            const city = locations.find((location) => location.id === place.id);
            return city ? (
              <Link
                key={place.id}
                href={`/weather/${place.id}`}
                aria-label={`Saved place: ${city.name}`}
                {...stylex.props(styles.savedLink)}
              >
                <Star size={12} fill="currentColor" aria-hidden="true" />
                {city.name}
              </Link>
            ) : null;
          })}
        </nav>
      )}
      {isLoadingError && (
        <Button
          label="Retry saved places"
          size="sm"
          variant="ghost"
          onClick={() => void retry()}
        />
      )}
      <div role="status" aria-live="polite">
        {error && <p {...stylex.props(styles.savedError)}>{error}</p>}
      </div>
    </div>
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

const styles = stylex.create({
  savedPlaces: { marginTop: 12 },
  savedList: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  savedLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    backgroundColor: '#e4ebd6',
    color: '#344f33',
    padding: '6px 10px',
    borderRadius: 16,
    textDecoration: 'none',
  },
  savedError: { color: '#7c3f28', fontSize: 11, lineHeight: 1.6, marginTop: 8 },
  layout: {
    display: 'grid',
    gridTemplateColumns: {
      default: '230px minmax(0, 1fr)',
      '@media (max-width: 900px)': '190px minmax(0, 1fr)',
      '@media (max-width: 700px)': '1fr',
    },
    gap: { default: 54, '@media (max-width: 1100px)': 30 },
    paddingBlock: { default: 44, '@media (max-width: 700px)': 28 },
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    paddingRight: { default: 26, '@media (max-width: 700px)': 0 },
    borderRightWidth: { default: 1, '@media (max-width: 700px)': 0 },
    borderRightStyle: 'solid',
    borderRightColor: '#d9ded7',
  },
  eyebrow: {
    color: '#697b70',
    fontSize: 10,
    letterSpacing: '1.8px',
    fontWeight: 700,
    marginBottom: 12,
  },
  sidebarTitle: {
    fontSize: 28,
    fontWeight: 500,
    letterSpacing: '-1px',
    lineHeight: 1.15,
    marginBottom: 30,
    display: { default: 'block', '@media (max-width: 700px)': 'none' },
  },
  listLabel: {
    color: '#718077',
    fontSize: 9,
    letterSpacing: '1.7px',
    marginTop: 28,
    marginBottom: 12,
  },
  locations: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    maxHeight: { default: 405, '@media (max-width: 700px)': 130 },
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    paddingRight: 4,
  },
  location: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textDecoration: 'none',
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    color: '#5d7067',
    backgroundColor: { default: 'transparent', ':hover': '#e9ece2' },
  },
  locationActive: {
    backgroundColor: { default: '#e4ebd6', ':hover': '#dce7c7' },
    color: '#243a2a',
    fontWeight: 700,
  },
  sidebarFoot: {
    marginTop: 32,
    fontSize: 11,
    lineHeight: 2.1,
    display: { default: 'block', '@media (max-width: 700px)': 'none' },
  },
  greenDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    backgroundColor: '#64844c',
    borderRadius: '50%',
    marginRight: 8,
  },
  muted: { color: '#65756e', fontSize: 11 },
  content: { minWidth: 0 },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 27,
  },
  title: {
    fontSize: { default: 52, '@media (max-width: 900px)': 42 },
    fontWeight: 500,
    letterSpacing: '-2.4px',
    lineHeight: 1.05,
  },
  comma: { color: '#77935b' },
  subtitle: { fontSize: 12, color: '#66766e', marginTop: 12 },
  units: {
    border: 0,
    margin: 0,
    display: 'flex',
    backgroundColor: '#e8ebe3',
    padding: 4,
    borderRadius: 24,
    alignSelf: 'center',
    flexShrink: 0,
  },
  unit: {
    cursor: 'pointer',
    border: 0,
    padding: '8px 12px',
    borderRadius: 20,
    fontSize: 11,
    backgroundColor: 'transparent',
    color: '#647368',
  },
  unitActive: { backgroundColor: '#243b37', color: '#fff' },
  hero: {
    backgroundColor: '#203b40',
    color: '#fff',
    borderRadius: 16,
    minHeight: 290,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    position: 'relative',
    overflow: 'hidden',
  },
  heroCopy: {
    padding: { default: 32, '@media (max-width: 900px)': 24 },
    position: 'relative',
    zIndex: 2,
    gridColumn: '1 / -1',
    gridRow: 1,
  },
  heroLabel: {
    color: '#c8d7d5',
    fontSize: 11,
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  heroPill: {
    padding: '5px 8px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#728b85',
    borderRadius: 20,
    fontSize: 7,
    letterSpacing: '1px',
  },
  heroTemp: {
    fontSize: { default: 90, '@media (max-width: 900px)': 76 },
    fontWeight: 400,
    letterSpacing: '-6px',
    lineHeight: 1.2,
    marginTop: 20,
  },
  heroUnit: {
    fontSize: 27,
    color: '#bdceca',
    letterSpacing: 0,
    verticalAlign: 'top',
    display: 'inline-block',
    paddingTop: 15,
    marginLeft: 4,
  },
  condition: {
    color: '#fff',
    fontSize: 17,
    letterSpacing: '-0.3px',
    maxWidth: '70%',
  },
  highLowItem: { display: 'flex', alignItems: 'center', gap: 4 },
  highLow: {
    display: 'flex',
    gap: 18,
    marginTop: 16,
    color: '#c2d2cd',
    fontSize: 11,
    alignItems: 'center',
  },
  sky: {
    position: 'relative',
    gridColumn: 2,
    gridRow: 1,
    opacity: { default: 1, '@media (max-width: 500px)': 0.45 },
    pointerEvents: 'none',
  },
  sun: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: '50%',
    backgroundImage:
      'linear-gradient(135deg, #f4e8ab 4%, #d7ce83 55%, #97ad83 100%)',
    top: 56,
    right: 44,
    boxShadow: '0 0 70px #e8e5a31a',
  },
  orbit: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: '50%',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#c6d8bd17',
    right: -52,
    top: -40,
  },
  orbitSmall: {
    position: 'absolute',
    width: 252,
    height: 252,
    borderRadius: '50%',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#c6d8bd17',
    right: -8,
    top: 4,
  },
  heroIcon: {
    position: 'absolute',
    top: 134,
    right: 44,
    color: '#f1f0db',
    filter: 'drop-shadow(0 8px 12px #203b4055)',
  },
  skyCaption: {
    position: 'absolute',
    bottom: 26,
    right: 30,
    fontSize: 7,
    letterSpacing: '2px',
    color: '#a8c0b7',
  },
  sectionHeading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: 500, letterSpacing: '-0.5px' },
  forecastGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: { default: 10, '@media (max-width: 1000px)': 6 },
    overflowX: 'auto',
  },
  day: {
    padding: { default: '18px 12px', '@media (max-width: 900px)': '16px 6px' },
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#dae0d6',
    borderRadius: 11,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: '#263c35',
    cursor: 'pointer',
    backgroundColor: { default: '#f9faf5', ':hover': '#eaf0df' },
    minWidth: 60,
    transition: 'background-color 150ms',
  },
  dayActive: {
    backgroundColor: { default: '#e4edce', ':hover': '#dce9be' },
    borderColor: '#bacb9b',
  },
  dayName: { fontSize: 12, fontWeight: 700 },
  dayDate: { fontSize: 10, color: '#607360', marginTop: 5 },
  dayIcon: { color: '#637c50', marginBlock: 22 },
  dayTemps: { fontSize: 20, letterSpacing: '-0.7px' },
  lowTemp: { color: '#69786a', fontSize: 13, marginLeft: 4 },
  rain: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    fontSize: 10,
    color: '#527774',
    marginTop: 12,
  },
  details: {
    display: 'grid',
    gridTemplateColumns: {
      default: '1fr 1fr 1.4fr',
      '@media (max-width: 1000px)': '1fr 1fr',
      '@media (max-width: 420px)': '1fr',
    },
    gap: 24,
    marginBlock: 28,
    paddingBlock: 24,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#d9ded7',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#d9ded7',
  },
  detail: { display: 'flex', gap: 12, alignItems: 'center', color: '#5e7969' },
  detailLabel: {
    fontSize: 8,
    letterSpacing: '1.2px',
    color: '#5d7065',
    marginBottom: 6,
  },
  detailValue: { fontSize: 20, fontWeight: 500, color: '#263d34' },
  coordinate: { fontSize: 12, color: '#263d34' },
  freshness: {
    flexWrap: 'wrap',
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freshnessText: {
    flex: '1 1 230px',
    fontSize: 10,
    color: '#67786e',
    lineHeight: 1.9,
  },
  attribution: { fontSize: 9, color: '#67786e', marginTop: 12 },
  error: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f4e4da',
    color: '#7c3f28',
    fontSize: 12,
  },
  empty: { paddingBlock: 60, lineHeight: 2 },
});
