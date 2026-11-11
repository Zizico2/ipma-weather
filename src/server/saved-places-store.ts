import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { SavedPlace } from '../lib/saved-places';

export interface SavedPlacesStore {
  list(visitorId: string): SavedPlace[];
  save(visitorId: string, locationId: number): void;
  remove(visitorId: string, locationId: number): void;
}

export function createSavedPlacesStore(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS saved_places (
      visitor_id TEXT NOT NULL,
      location_id INTEGER NOT NULL,
      PRIMARY KEY (visitor_id, location_id)
    );
  `);
  const list = database.prepare(
    'SELECT location_id AS id FROM saved_places WHERE visitor_id = ? ORDER BY location_id',
  );
  const insert = database.prepare(
    'INSERT OR IGNORE INTO saved_places (visitor_id, location_id) VALUES (?, ?)',
  );
  const remove = database.prepare(
    'DELETE FROM saved_places WHERE visitor_id = ? AND location_id = ?',
  );
  return {
    list: (visitorId: string): SavedPlace[] =>
      list.all(visitorId).map((row) => ({ id: Number(row.id) })),
    save: (visitorId: string, locationId: number) => {
      insert.run(visitorId, locationId);
    },
    remove: (visitorId: string, locationId: number) => {
      remove.run(visitorId, locationId);
    },
    close: () => database.close(),
  };
}
