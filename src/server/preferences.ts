import 'server-only';
import { createSavedPlacesStore } from './saved-places-store';

// Lazy initialization keeps filesystem access out of route-module compilation.
let store: ReturnType<typeof createSavedPlacesStore> | undefined;
function getStore() {
  store ??= createSavedPlacesStore(
    process.env.IPMA_PREFERENCES_DB ?? '.data/weather.sqlite',
  );
  return store;
}

export const preferences = {
  list: (visitorId: string) => getStore().list(visitorId),
  save: (visitorId: string, id: number) => getStore().save(visitorId, id),
  remove: (visitorId: string, id: number) => getStore().remove(visitorId, id),
};
