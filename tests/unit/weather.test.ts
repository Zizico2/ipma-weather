import { describe, expect, it } from 'vitest';
import {
  conditionKind,
  dayLabel,
  LATEST_LOCATION_COOKIE,
  LATEST_LOCATION_MAX_AGE_SECONDS,
  latestLocationCookie,
  latestLocationId,
  parseLocationId,
  temperature,
} from '../../src/lib/weather';

describe('weather presentation', () => {
  it('preserves zeroes, freezing temperatures, and missing measurements', () => {
    expect(temperature(null)).toBe('—');
    expect(temperature(0)).toBe('0°');
    expect(temperature(-3)).toBe('-3°');
    expect(temperature(0, 'F')).toBe('32°');
    expect(temperature(22, 'F')).toBe('72°');
  });
  it('formats civil dates independently of the local timezone', () => {
    expect(dayLabel('2026-11-11', 'long')).toBe('Wednesday 11 Nov');
  });
  it.each(['0', '-1', '1e6', '1110600garbage', '4294967296', '01', ''])(
    'rejects invalid uint32 IDs: %s',
    (value) => {
      expect(parseLocationId(value)).toBeNull();
    },
  );
  it('accepts supported ID syntax', () =>
    expect(parseLocationId('1110600')).toBe(1110600));
  it('defaults a missing or invalid latest city to Lisbon', () => {
    expect(latestLocationId(undefined)).toBe(1110600);
    expect(latestLocationId('')).toBe(1110600);
    expect(latestLocationId('1131200')).toBe(1131200);
    expect(latestLocationId('nope')).toBe(1110600);
    expect(latestLocationId('4294967296')).toBe(1110600);
  });
  it('writes a host cookie the next /weather request can read', () => {
    expect(latestLocationCookie(1131200)).toBe(
      `${LATEST_LOCATION_COOKIE}=1131200; Path=/; Max-Age=${LATEST_LOCATION_MAX_AGE_SECONDS}; SameSite=Lax`,
    );
    expect(latestLocationCookie(1110600, true)).toContain('; Secure');
  });
  it('uses the source weather codes and preserves unknowns', () => {
    expect(conditionKind(9)).toBe('rain');
    expect(conditionKind(18)).toBe('snow');
    expect(conditionKind(19)).toBe('storm');
    expect(conditionKind(26)).toBe('fog');
    expect(conditionKind(null)).toBe('unknown');
    expect(conditionKind(999)).toBe('unknown');
  });
});
