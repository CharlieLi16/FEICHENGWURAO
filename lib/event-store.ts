// In-memory event state store with Vercel Blob persistence

import { EventState, EventData, FemaleGuest, MaleGuest, SlideSlot, initialEventState, defaultSlideSlots } from './event-state';
import { loadEventData, saveEventData } from './event-persist';

// Global state (initialized with defaults, synced from Blob on first access)
let eventState: EventState = { ...initialEventState };
let femaleGuests: FemaleGuest[] = [];
let maleGuests: MaleGuest[] = [];
let slides: SlideSlot[] = [...defaultSlideSlots];

// Track last loaded savedAt to avoid overwriting newer data with older data
let lastLoadedSavedAt = 0;

// Flag to track if we've attempted hydration
let hasHydrated = false;

// Flag to track if hydration was SUCCESSFUL
// CRITICAL: Saves are blocked until this is true to prevent empty state overwrites
let hydrationSuccessful = false;

// Mutex lock for save operations (prevents concurrent writes from stomping each other)
let saveLock: Promise<void> = Promise.resolve();

// Helper to delay for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Hydrate from Blob ONCE on cold start with retry logic
// This prevents empty memory from overwriting existing Blob data
// CRITICAL: If hydration fails after retries, saves are BLOCKED (hydrationSuccessful stays false)
async function ensureHydratedOnce(): Promise<void> {
  if (hasHydrated) return;
  hasHydrated = true; // Mark that we've attempted (prevents multiple concurrent attempts)
  
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[EventStore] Hydration attempt ${attempt}/${maxRetries}...`);
      const savedData = await loadEventData();
      
      if (savedData) {
        // Blob data found - load it
        lastLoadedSavedAt = savedData.savedAt;
        femaleGuests = savedData.femaleGuests || [];
        maleGuests = savedData.maleGuests || [];
        slides = savedData.slides || [...defaultSlideSlots];
        if (savedData.eventState) {
          console.log('[EventStore] Hydration - heartChoice:', savedData.eventState.heartChoice, 'phase:', savedData.eventState.phase);
          eventState = { ...eventState, ...savedData.eventState, lastUpdated: Date.now() };
        }
        console.log('[EventStore] Hydrated from Blob successfully, savedAt:', new Date(savedData.savedAt).toISOString());
        hydrationSuccessful = true;
        return;
      } else {
        // No Blob data found (first deployment or empty) - this is OK, allow saves with defaults
        console.log('[EventStore] No Blob data found, using defaults (first deployment)');
        hydrationSuccessful = true;
        return;
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`[EventStore] Hydration attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt < maxRetries) {
        await delay(500 * attempt); // Exponential backoff: 500ms, 1000ms, 1500ms
      }
    }
  }
  
  // All retries failed - DO NOT set hydrationSuccessful, saves will be blocked
  console.error('[EventStore] CRITICAL: Hydration failed after all retries. Saves are BLOCKED to prevent data loss.');
  throw new Error(`Hydration failed after ${maxRetries} retries: ${lastError?.message}`);
}

// Get current data for persistence
function getDataForSave() {
  return {
    femaleGuests, 
    maleGuests, 
    slides,
    eventState: {
      phase: eventState.phase,
      currentMaleGuest: eventState.currentMaleGuest,
      currentRound: eventState.currentRound,
      lights: eventState.lights,
      heartChoice: eventState.heartChoice,
      stageBackground: eventState.stageBackground,
      backgroundBlur: eventState.backgroundBlur,
      useGoogleSlides: eventState.useGoogleSlides,
      // Stage-critical state (舞台需要这些来正确显示)
      currentFemaleIntro: eventState.currentFemaleIntro,
      currentSlide: eventState.currentSlide,
      vcrPlaying: eventState.vcrPlaying,
      vcrType: eventState.vcrType,
      message: eventState.message,
      // Don't persist Director-only UI state: showingProfile, showingTag
    },
  };
}

// IMMEDIATE save - for all state changes
// Returns a promise that resolves when save is complete
// CRITICAL: Uses mutex lock to prevent concurrent writes from stomping each other
// CRITICAL: Hydrates ONCE on cold start, but does NOT refresh during writes (would lose local changes)
// CRITICAL: Blocks saves if hydration failed (prevents empty state from overwriting good data)
export async function triggerSaveImmediate(): Promise<void> {
  // Chain onto the save lock to serialize writes within this instance
  // This prevents: A reads V1, B reads V1, A writes V2, B writes V3 (loses A's changes)
  saveLock = saveLock.then(async () => {
    // Only hydrate on cold start - do NOT refresh during writes
    // (refreshing during writes would overwrite local changes with older Blob data)
    await ensureHydratedOnce();
    
    // CRITICAL: Block saves if hydration failed
    // This prevents a cold-started instance with default empty state from overwriting real data
    if (!hydrationSuccessful) {
      throw new Error('BLOCKED: Cannot save - hydration failed. Refusing to overwrite Blob with potentially stale/empty data.');
    }
    
    const dataToSave = getDataForSave();
    console.log('[EventStore] Saving - heartChoice:', dataToSave.eventState.heartChoice, 'phase:', dataToSave.eventState.phase);
    const savedAt = await saveEventData(dataToSave);
    // Update our tracking so subsequent refreshes know we have this version
    lastLoadedSavedAt = savedAt;
  }).catch(err => {
    // Log but don't break the lock chain
    console.error('[Persist] saveLock error:', err);
    throw err;
  });
  return saveLock;
}

// Subscribers for SSE
type Subscriber = (data: EventData) => void;
const subscribers: Set<Subscriber> = new Set();

// Return type includes savedAt for SSE change detection
export interface EventDataWithSavedAt extends EventData {
  savedAt: number;
}

// Fetch fresh from Blob - ensures consistency across serverless instances
// ALWAYS returns Blob data for reads (SSE) to ensure clients get latest persisted state
// Returns savedAt for SSE to use for change detection (more reliable than lastUpdated)
export async function getEventDataFresh(): Promise<EventDataWithSavedAt> {
  try {
    const savedData = await loadEventData();
    if (savedData) {
      // ALWAYS use Blob data for reads - this ensures SSE clients get the latest persisted state
      // even if in-memory state differs (e.g., due to pending writes or stale cache)
      const blobEventState = savedData.eventState ? {
        ...initialEventState,
        ...savedData.eventState,
        lastUpdated: Date.now(),
      } : initialEventState;
      
      console.log('[EventStore] Returning Blob data - heartChoice:', savedData.eventState?.heartChoice, 'phase:', savedData.eventState?.phase, 'savedAt:', new Date(savedData.savedAt).toISOString());
      
      // Also update in-memory state to keep it in sync (for write operations)
      if (savedData.savedAt > lastLoadedSavedAt) {
        lastLoadedSavedAt = savedData.savedAt;
        femaleGuests = savedData.femaleGuests || [];
        maleGuests = savedData.maleGuests || [];
        slides = savedData.slides || [...defaultSlideSlots];
        eventState = blobEventState;
        console.log('[EventStore] Also updated in-memory state');
      }
      
      // Return Blob data directly (not in-memory cache)
      return {
        state: blobEventState,
        femaleGuests: savedData.femaleGuests || [],
        maleGuests: savedData.maleGuests || [],
        slides: savedData.slides || [...defaultSlideSlots],
        savedAt: savedData.savedAt,
      };
    }
  } catch (error) {
    console.error('[EventStore] Failed to refresh from Blob:', error);
  }
  
  // Fallback to in-memory state if Blob load fails
  return {
    state: eventState,
    femaleGuests,
    maleGuests,
    slides,
    savedAt: lastLoadedSavedAt,
  };
}

// Sync version for SSE (initialization should have happened already)
export function getEventData(): EventData {
  return {
    state: eventState,
    femaleGuests,
    maleGuests,
    slides,
  };
}

export function getEventState(): EventState {
  return eventState;
}

export async function updateEventState(updates: Partial<EventState>): Promise<EventState> {
  eventState = {
    ...eventState,
    ...updates,
    lastUpdated: Date.now(),
  };
  notifySubscribers();
  
  // IMMEDIATE save for runtime state changes - ensures consistency across instances
  // Includes all persisted fields (core + stage-critical)
  const persistKeys = [
    'phase', 'currentMaleGuest', 'currentRound', 'lights', 'heartChoice', 
    'stageBackground', 'backgroundBlur', 'useGoogleSlides',
    // Stage-critical fields (舞台需要这些)
    'currentFemaleIntro', 'currentSlide', 'vcrPlaying', 'vcrType', 'message'
  ];
  if (persistKeys.some(key => key in updates)) {
    await triggerSaveImmediate();
  }
  return eventState;
}

export async function setLight(guestId: number, status: 'on' | 'off' | 'burst'): Promise<EventState> {
  eventState = {
    ...eventState,
    lights: {
      ...eventState.lights,
      [guestId]: status,
    },
    lastUpdated: Date.now(),
  };
  notifySubscribers();
  await triggerSaveImmediate();  // Wait for save to complete
  return eventState;
}

export async function resetLights(): Promise<EventState> {
  eventState = {
    ...eventState,
    lights: {
      1: 'on', 2: 'on', 3: 'on', 4: 'on',
      5: 'on', 6: 'on', 7: 'on', 8: 'on',
      9: 'on', 10: 'on', 11: 'on', 12: 'on',
    },
    lastUpdated: Date.now(),
  };
  notifySubscribers();
  await triggerSaveImmediate();  // Wait for save to complete
  return eventState;
}

// Check if female guest has any meaningful content
function femaleGuestHasContent(g: FemaleGuest): boolean {
  return !!(g.name?.trim() || g.photo || (g.photos && g.photos.length > 0));
}

// Check if male guest has any meaningful content
function maleGuestHasContent(g: MaleGuest): boolean {
  return !!(g.name?.trim() || g.vcr1Url || g.vcr2Url || g.photo);
}

export async function setFemaleGuests(guests: FemaleGuest[]): Promise<void> {
  // Hydrate once on cold start (so currentHasContent check works correctly)
  await ensureHydratedOnce();
  
  // Protection: refuse to overwrite non-empty data with completely empty data
  const newHasContent = guests.some(femaleGuestHasContent);
  const currentHasContent = femaleGuests.some(femaleGuestHasContent);
  
  if (currentHasContent && !newHasContent) {
    const error = new Error('BLOCKED: Refusing to overwrite female guests with empty data');
    console.error('[BLOCKED]', error.message);
    throw error;  // Throw so caller knows it was blocked
  }
  
  femaleGuests = guests;
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  await triggerSaveImmediate();  // Immediate save - wait for Blob persistence
}

export async function setMaleGuests(guests: MaleGuest[]): Promise<void> {
  // Hydrate once on cold start (so currentHasContent check works correctly)
  await ensureHydratedOnce();
  
  // Log for debugging
  const newHasContent = guests.some(maleGuestHasContent);
  const currentHasContent = maleGuests.some(maleGuestHasContent);
  
  console.log('[setMaleGuests] Incoming guests:', guests.map(g => ({
    id: g.id,
    name: g.name,
    vcr1: g.vcr1Url?.substring(0, 50),
    vcr2: g.vcr2Url?.substring(0, 50),
  })));
  console.log('[setMaleGuests] Current in-memory:', maleGuests.map(g => ({
    id: g.id,
    name: g.name,
    vcr1: g.vcr1Url?.substring(0, 50),
    vcr2: g.vcr2Url?.substring(0, 50),
  })));
  console.log('[setMaleGuests] newHasContent:', newHasContent, 'currentHasContent:', currentHasContent);
  
  // Protection: refuse to overwrite non-empty data with completely empty data
  if (currentHasContent && !newHasContent) {
    const error = new Error('BLOCKED: Refusing to overwrite male guests with empty data');
    console.error('[BLOCKED]', error.message);
    throw error;  // Throw so caller knows it was blocked
  }
  
  maleGuests = guests;
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  await triggerSaveImmediate();  // Immediate save - wait for Blob persistence
  console.log('[setMaleGuests] Save completed successfully');
}

export function getFemaleGuests(): FemaleGuest[] {
  return femaleGuests;
}

export function getMaleGuests(): MaleGuest[] {
  return maleGuests;
}

export function getSlides(): SlideSlot[] {
  return slides;
}

export async function setSlides(newSlides: SlideSlot[]): Promise<void> {
  slides = newSlides;
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  // Use immediate save - debounced save unreliable in serverless (container may freeze)
  await triggerSaveImmediate();
}

export async function updateSlide(slideId: string, imageUrl: string | null): Promise<void> {
  slides = slides.map(slide => 
    slide.id === slideId ? { ...slide, imageUrl: imageUrl || undefined } : slide
  );
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  // Use immediate save - debounced save unreliable in serverless (container may freeze)
  await triggerSaveImmediate();
}

export function resetEvent(): void {
  eventState = { ...initialEventState, lastUpdated: Date.now() };
  notifySubscribers();
}

// SSE subscription management
export function subscribe(callback: Subscriber): () => void {
  subscribers.add(callback);
  // Immediately send current state
  callback(getEventData());
  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
  };
}

function notifySubscribers(): void {
  const data = getEventData();
  subscribers.forEach((callback) => {
    try {
      callback(data);
    } catch (e) {
      console.error('Error notifying subscriber:', e);
    }
  });
}
