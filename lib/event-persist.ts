// Persist event data to Vercel Blob as JSON
// This ensures data survives serverless function restarts

import { put, head, del } from '@vercel/blob';
import { EventData, EventState, FemaleGuest, MaleGuest, SlideSlot } from './event-state';

const BLOB_PATH = 'event-data/state.json';

interface PersistedData {
  femaleGuests: FemaleGuest[];
  maleGuests: MaleGuest[];
  slides: SlideSlot[];
  eventState?: Partial<EventState>;  // Runtime state (phase, currentRound, lights, etc.)
  stageBackground?: string;  // Legacy - now part of eventState
  backgroundBlur?: number;   // Legacy - now part of eventState
  savedAt: number;
}

// Save event data to Vercel Blob
export async function saveEventData(data: {
  femaleGuests: FemaleGuest[];
  maleGuests: MaleGuest[];
  slides: SlideSlot[];
  eventState?: Partial<EventState>;
  stageBackground?: string;
  backgroundBlur?: number;
}): Promise<void> {
  try {
    const persistedData: PersistedData = {
      ...data,
      savedAt: Date.now(),
    };

    const json = JSON.stringify(persistedData, null, 2);
    
    // Delete old file first (Vercel Blob doesn't support overwrite directly)
    try {
      const existing = await head(BLOB_PATH);
      if (existing) {
        await del(existing.url);
      }
    } catch {
      // File doesn't exist, that's fine
    }

    await put(BLOB_PATH, json, {
      access: 'public',
      contentType: 'application/json',
    });

    console.log('[Persist] Event data saved to Blob');
  } catch (error) {
    console.error('[Persist] Failed to save event data:', error);
    // Don't throw - persistence failure shouldn't break the app
  }
}

// Load event data from Vercel Blob
export async function loadEventData(): Promise<PersistedData | null> {
  try {
    // Check if file exists
    const blobInfo = await head(BLOB_PATH);
    if (!blobInfo) {
      console.log('[Persist] No saved data found');
      return null;
    }

    // Fetch the JSON content
    const response = await fetch(blobInfo.url);
    if (!response.ok) {
      console.error('[Persist] Failed to fetch saved data');
      return null;
    }

    const data: PersistedData = await response.json();
    console.log('[Persist] Event data loaded from Blob, saved at:', new Date(data.savedAt).toISOString());
    
    return data;
  } catch (error) {
    console.error('[Persist] Failed to load event data:', error);
    return null;
  }
}

// Debounced save - prevents too many writes
let saveTimeout: NodeJS.Timeout | null = null;
let pendingData: Parameters<typeof saveEventData>[0] | null = null;

export function debouncedSave(data: Parameters<typeof saveEventData>[0]): void {
  pendingData = data;
  
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(async () => {
    if (pendingData) {
      await saveEventData(pendingData);
      pendingData = null;
    }
    saveTimeout = null;
  }, 2000); // Wait 2 seconds before saving
}
