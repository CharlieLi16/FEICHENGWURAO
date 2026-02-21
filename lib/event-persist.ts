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

    // Filter for exact pathname match first (avoid matching state.json.bak etc)
    const exactMatches = blobs.filter(b => b.pathname === BLOB_PATH);
    const candidates = exactMatches.length > 0 ? exactMatches : blobs;
    
    // Sort by uploadedAt to get the latest version (handles edge cases with multiple blobs)
    const latest = candidates.sort((a, b) => {
      const ta = new Date(a.uploadedAt).getTime();
      const tb = new Date(b.uploadedAt).getTime();
      return tb - ta;  // Descending - latest first
    })[0];

    if (!latest) {
      console.log('[Persist] No valid blob found');
      return null;
    }

    // Fetch with cache busting to avoid CDN/browser caching stale data
    const response = await fetch(`${latest.url}?t=${Date.now()}`, { 
      cache: 'no-store' 
    });
    if (!response.ok) {
      console.error('[Persist] Failed to fetch saved data:', response.status);
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

// NOTE: Debounced save removed - unreliable in serverless environments
// (container may freeze before timeout executes)
// All saves now use immediate save via triggerSaveImmediate()
