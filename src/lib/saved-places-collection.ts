import { collectionOptions } from '@tanstack/db';
import type { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { SavedPlace, SavedPlacesLoader } from './saved-places';

// Personal preferences are browser-loaded, outside the public RSC snapshot.
export const savedPlacesCollection = collectionOptions('saved-places', (db) => {
  const loader = () => db.requireDependency<SavedPlacesLoader>('savedPlaces');
  return queryCollectionOptions({
    id: 'saved-places',
    queryClient: db.requireDependency<QueryClient>('queryClient'),
    queryKey: ['saved-places'],
    queryFn: ({ signal }) => loader().list(signal),
    getKey: (row: SavedPlace) => row.id,
    staleTime: 30_000,
    retry: false,
    onInsert: async ({ transaction, collection }) => {
      for (const mutation of transaction.mutations) {
        const confirmed = await loader().save(mutation.modified.id);
        await collection.utils.writeInsert(confirmed);
      }
    },
    onDelete: async ({ transaction, collection }) => {
      for (const mutation of transaction.mutations) {
        await loader().remove(mutation.original.id);
        await collection.utils.writeDelete(mutation.original.id);
      }
    },
  });
});
