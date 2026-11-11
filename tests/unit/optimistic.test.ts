import { describe, expect, it, vi } from 'vitest';
import { createWeatherDb } from '../../src/lib/collections';
import type { SavedPlace } from '../../src/lib/saved-places';
import { savedPlacesCollection } from '../../src/lib/saved-places-collection';

describe('TanStack DB optimistic saved places', () => {
  it('inserts immediately, waits for acknowledgement, and rolls back failed deletes', async () => {
    let confirm!: (row: SavedPlace) => void;
    const acknowledgement = new Promise<SavedPlace>((resolve) => {
      confirm = resolve;
    });
    const scope = createWeatherDb(
      { locations: async () => [], forecast: async () => [] },
      {
        list: async () => [],
        save: () => acknowledgement,
        remove: async () => {
          throw new Error('offline');
        },
      },
    );
    try {
      const collection = scope.db.collection(savedPlacesCollection);
      await collection.preload();
      const insert = collection.insert({ id: 1110600 });
      expect(collection.has(1110600)).toBe(true);
      expect(insert.state).not.toBe('completed');
      confirm({ id: 1110600 });
      await insert.when('settled');
      expect(collection.has(1110600)).toBe(true);
      const remove = collection.delete(1110600);
      expect(collection.has(1110600)).toBe(false);
      await expect(remove.when('settled')).rejects.toThrow('offline');
      expect(collection.has(1110600)).toBe(true);
    } finally {
      await scope.db.cleanup();
      scope.queryClient.clear();
    }
  });

  it('removes an optimistic insert when persistence fails', async () => {
    const scope = createWeatherDb(
      { locations: async () => [], forecast: async () => [] },
      {
        list: async () => [],
        save: vi.fn(async () => {
          throw new Error('offline');
        }),
        remove: async () => {},
      },
    );
    try {
      const collection = scope.db.collection(savedPlacesCollection);
      await collection.preload();
      const insert = collection.insert({ id: 1110600 });
      expect(collection.has(1110600)).toBe(true);
      await expect(insert.when('settled')).rejects.toThrow('offline');
      expect(collection.has(1110600)).toBe(false);
    } finally {
      await scope.db.cleanup();
      scope.queryClient.clear();
    }
  });
});
