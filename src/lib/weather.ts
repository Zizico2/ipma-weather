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

/** Last city the visitor opened. Read on `/weather` before choosing a redirect. */
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
