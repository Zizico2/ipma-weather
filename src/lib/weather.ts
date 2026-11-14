export type WeatherLocation = {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

export type Forecast = {
  id: string;
  locationId: number;
  date: string;
  minimum: number | null;
  maximum: number | null;
  rain: number | null;
  windDirection: string;
  condition: string;
  weatherCode: number | null;
  fetchedAt: string | null;
  updatedAt: string | null;
  attribution: string;
  sourceUrl: string;
};

export const DEFAULT_LOCATION_ID = 1110600;

/** Last city the visitor opened. `/` and `/weather` redirect here, or to Lisbon. */
export const LATEST_LOCATION_COOKIE = 'latest-location';

/** Chrome drops cookies whose Max-Age is longer than 400 days. */
export const LATEST_LOCATION_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export function parseLocationId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= 4_294_967_295 ? id : null;
}

export function latestLocationId(value: string | undefined): number {
  if (!value) return DEFAULT_LOCATION_ID;
  return parseLocationId(value) ?? DEFAULT_LOCATION_ID;
}

export function latestLocationCookie(id: number, secure = false): string {
  const secureAttribute = secure ? '; Secure' : '';
  return `${LATEST_LOCATION_COOKIE}=${id}; Path=/; Max-Age=${LATEST_LOCATION_MAX_AGE_SECONDS}; SameSite=Lax${secureAttribute}`;
}

export function temperature(
  value: number | null,
  unit: 'C' | 'F' = 'C',
): string {
  if (value === null) return '—';
  return `${Math.round(unit === 'F' ? (value * 9) / 5 + 32 : value)}°`;
}

export function dayLabel(
  date: string,
  format: 'short' | 'long' = 'short',
): string {
  // Forecast dates are civil dates. Fix the timezone to avoid shifting a day.
  return new Intl.DateTimeFormat('en-GB', {
    weekday: format,
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

export function conditionKind(
  code: number | null,
): 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog' | 'unknown' {
  // IPMA's weather-type-classe.json codes, not the protobuf enum ordinals.
  if (code === null || code < 1 || code > 30) return 'unknown';
  if (code === 1) return 'sun';
  if ([18, 21, 22, 28, 29, 30].includes(code)) return 'snow';
  if ([19, 20, 23].includes(code)) return 'storm';
  if ([16, 17, 26].includes(code)) return 'fog';
  if (code >= 6 && code <= 15) return 'rain';
  return 'cloud';
}

export type HourlyForecast = Pick<
  Forecast,
  | 'id'
  | 'locationId'
  | 'weatherCode'
  | 'condition'
  | 'updatedAt'
  | 'fetchedAt'
  | 'sourceUrl'
  | 'attribution'
> & {
  forecastAt: string;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: string;
  rainProbability: number | null;
};

export function locationTimeZone(locationId: number): string {
  return String(locationId).startsWith('3')
    ? 'Atlantic/Azores'
    : 'Europe/Lisbon';
}

export function localDate(value: string | number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

/** Next ten clock hours; gaps stay gaps. Today includes all published local-day hours. */
export function selectHourlyForecasts(
  forecasts: HourlyForecast[],
  view: 'next' | 'today',
  now: number,
  timeZone: string,
): HourlyForecast[] {
  const today = localDate(now, timeZone);
  return forecasts
    .filter((row) => {
      const at = Date.parse(row.forecastAt);
      return view === 'today'
        ? localDate(row.forecastAt, timeZone) === today
        : at >= now && at < now + 10 * 60 * 60 * 1000;
    })
    .sort((a, b) => a.forecastAt.localeCompare(b.forecastAt));
}

/** Group visible hourly tiles by their nearest published three-hour period endpoint. */
export function rainPeriods(
  forecasts: HourlyForecast[],
  visible: HourlyForecast[],
) {
  const published = forecasts
    .filter((row) => row.rainProbability !== null)
    .sort((a, b) => a.forecastAt.localeCompare(b.forecastAt));
  const groups: {
    startIndex: number;
    length: number;
    probability: number;
    endsAt: string;
    startsAt: string;
  }[] = [];
  visible.forEach((row, index) => {
    const at = Date.parse(row.forecastAt);
    const endpoint = published.find((source) => {
      const delta = Date.parse(source.forecastAt) - at;
      return delta >= 0 && delta < 3_600_000 * 3;
    });
    if (!endpoint) return;
    const last = groups[groups.length - 1];
    if (
      last?.endsAt === endpoint.forecastAt &&
      last.startIndex + last.length === index
    )
      last.length++;
    else
      groups.push({
        startIndex: index,
        length: 1,
        probability: endpoint.rainProbability!,
        endsAt: endpoint.forecastAt,
        startsAt: new Date(
          Date.parse(endpoint.forecastAt) - 3 * 3_600_000,
        ).toISOString(),
      });
  });
  return groups;
}
