import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { csrf } from 'hono/csrf';
import { parseLocationId } from '../lib/weather';
import type { WeatherService } from './api';
import type { SavedPlacesStore } from './saved-places-store';

const COOKIE = 'tempo-visitor';
const validVisitor = (value: string | undefined): value is string =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(value));

export function createSavedPlacesApi(
  store: SavedPlacesStore,
  weather: WeatherService,
) {
  return new Hono()
    .use('*', csrf())
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      await next();
    })
    .get('/', (c) => {
      let visitor = getCookie(c, COOKIE);
      if (!validVisitor(visitor)) {
        visitor = randomUUID();
        setCookie(c, COOKIE, visitor, {
          httpOnly: true,
          sameSite: 'Lax',
          secure: new URL(c.req.url).protocol === 'https:',
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
        });
      }
      return c.json(store.list(visitor));
    })
    .post('/:id', async (c) => {
      const visitor = getCookie(c, COOKIE);
      if (!validVisitor(visitor))
        return c.json({ error: 'Load saved places first.' }, 409);
      const id = parseLocationId(c.req.param('id'));
      if (id === null) return c.json({ error: 'Invalid location ID.' }, 400);
      if (
        !(await weather.getLocations()).some((location) => location.id === id)
      )
        return c.json({ error: 'Location not found.' }, 404);
      store.save(visitor, id);
      return c.json({ id });
    })
    .delete('/:id', (c) => {
      const visitor = getCookie(c, COOKIE);
      if (!validVisitor(visitor))
        return c.json({ error: 'Load saved places first.' }, 409);
      const id = parseLocationId(c.req.param('id'));
      if (id === null) return c.json({ error: 'Invalid location ID.' }, 400);
      store.remove(visitor, id);
      return c.body(null, 204);
    });
}
