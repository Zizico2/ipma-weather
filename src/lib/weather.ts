import { z } from 'zod';

export const locationSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});
export type WeatherLocation = z.infer<typeof locationSchema>;

export const forecastSchema = z.object({
  id: z.string(),
  locationId: z.number().int().positive(),
  date: z.iso.date(),
  minimum: z.number().nullable(),
  maximum: z.number().nullable(),
  rain: z.number().nullable(),
  windDirection: z.string(),
  condition: z.string(),
  weatherCode: z.number().nullable(),
  fetchedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime().nullable(),
  attribution: z.string(),
  sourceUrl: z.string(),
});
export type Forecast = z.infer<typeof forecastSchema>;

export const DEFAULT_LOCATION_ID = 1110600;

export function parseLocationId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= 4_294_967_295 ? id : null;
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
