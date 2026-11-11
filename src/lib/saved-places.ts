import { z } from 'zod';

export const savedPlaceSchema = z.object({ id: z.number().int().positive() });
export type SavedPlace = z.infer<typeof savedPlaceSchema>;

export interface SavedPlacesLoader {
  list(signal?: AbortSignal): Promise<SavedPlace[]>;
  save(id: number): Promise<SavedPlace>;
  remove(id: number): Promise<void>;
}
