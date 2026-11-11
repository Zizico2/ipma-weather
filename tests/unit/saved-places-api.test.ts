import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createWeatherApi } from '../../src/server/api';
import { createSavedPlacesStore } from '../../src/server/saved-places-store';

describe('saved places persistence and HTTP boundary', () => {
  const weather = {
    getLocations: async () => [
      { id: 1110600, name: 'Lisboa', latitude: null, longitude: null },
    ],
    getForecast: async () => [],
  };

  it('persists across connections and isolates anonymous visitors', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tempo-'));
    const path = join(directory, 'preferences.sqlite');
    try {
      const store = createSavedPlacesStore(path);
      store.save('alice', 1110600);
      store.save('alice', 1110600);
      expect(store.list('bob')).toEqual([]);
      store.close();
      const reopened = createSavedPlacesStore(path);
      expect(reopened.list('alice')).toEqual([{ id: 1110600 }]);
      reopened.remove('bob', 1110600);
      expect(reopened.list('alice')).toHaveLength(1);
      reopened.remove('alice', 1110600);
      expect(reopened.list('alice')).toEqual([]);
      reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('issues a private cookie, validates writes, and never caches personal rows', async () => {
    const store = createSavedPlacesStore(':memory:');
    const app = createWeatherApi(weather, store);
    try {
      const initial = await app.request('/api/saved-places');
      expect(initial.status).toBe(200);
      expect(initial.headers.get('cache-control')).toBe('private, no-store');
      expect(initial.headers.get('set-cookie')).toContain('HttpOnly');
      const cookie = initial.headers.get('set-cookie')?.split(';')[0] ?? '';
      const headers = { cookie, origin: 'http://localhost' };
      expect(
        (
          await app.request('/api/saved-places/1110600', {
            method: 'POST',
            headers: { origin: 'http://localhost' },
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await app.request('/api/saved-places/123', {
            method: 'POST',
            headers,
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await app.request('/api/saved-places/1110600', {
            method: 'POST',
            headers,
          })
        ).status,
      ).toBe(200);
      expect(
        await (await app.request('/api/saved-places', { headers })).json(),
      ).toEqual([{ id: 1110600 }]);
      expect(await (await app.request('/api/saved-places')).json()).toEqual([]);
      expect(
        (
          await app.request('/api/saved-places/1110600', {
            method: 'POST',
            headers: {
              cookie,
              origin: 'https://evil.example',
              'content-type': 'text/plain',
            },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await app.request('/api/saved-places/1110600', {
            method: 'DELETE',
            headers,
          })
        ).status,
      ).toBe(204);
      expect(
        await (await app.request('/api/saved-places', { headers })).json(),
      ).toEqual([]);
    } finally {
      store.close();
    }
  });
});
