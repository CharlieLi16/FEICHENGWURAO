// Persist event data to Vercel Blob as JSON
// This ensures data survives serverless function restarts

import { put, list } from '@vercel/blob';
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
  const persistedData: PersistedData = {
    ...data,
    savedAt: Date.now(),
  };

  // Log what we're saving
  console.log('[Persist] Saving to Blob:', {
    maleGuestsCount: data.maleGuests.length,
    maleGuestsWithVCR: data.maleGuests.filter(g => g.vcr1Url || g.vcr2Url).length,
    femaleGuestsCount: data.femaleGuests.length,
  });

  const json = JSON.stringify(persistedData, null, 2);
  
  // Single PUT with allowOverwrite: true allows overwriting existing file
  const result = await put(BLOB_PATH, json, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,  // Required for overwriting existing blobs
  });

  console.log('[Persist] Event data saved to Blob:', result.url);
  // Now throws on failure - caller will know if save failed
}

// Load event data from Vercel Blob
export async function loadEventData(): Promise<PersistedData | null> {
  try {
    // List blobs with the prefix to find the file
    const { blobs } = await list({ prefix: BLOB_PATH });
    if (blobs.length === 0) {
      console.log('[Persist] No saved data found');
      return null;
    }

    // Fetch the JSON content
    const response = await fetch(blobs[0].url);
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
