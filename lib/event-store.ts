// In-memory event state store with Vercel Blob persistence

import { EventState, EventData, FemaleGuest, MaleGuest, SlideSlot, initialEventState, defaultSlideSlots } from './event-state';
import { loadEventData, saveEventData, saveEventDataWithTimestamp } from './event-persist';

// Global state (initialized with defaults, synced from Blob on first access)
let eventState: EventState = { ...initialEventState };
let femaleGuests: FemaleGuest[] = [];
let maleGuests: MaleGuest[] = [];
let slides: SlideSlot[] = [...defaultSlideSlots];

// Track last loaded savedAt to avoid overwriting newer data with older data
let lastLoadedSavedAt = 0;

// Flag to track if hydration was SUCCESSFUL
// CRITICAL: Saves are blocked until this is true to prevent empty state overwrites
let hydrationSuccessful = false;

// In-flight hydration promise (prevents concurrent attempts, but allows retry on failure)
let hydrationPromise: Promise<void> | null = null;

// Mutex lock for save operations (prevents concurrent writes from stomping each other)
let saveLock: Promise<void> = Promise.resolve();

// Helper to delay for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Hydrate from Blob ONCE on cold start with retry logic
// This prevents empty memory from overwriting existing Blob data
// CRITICAL: Uses promise-based approach so failures can be retried (not permanently locked)
async function ensureHydratedOnce(): Promise<void> {
  // Already successfully hydrated - nothing to do
  if (hydrationSuccessful) return;
  
  // Hydration already in progress - wait for it
  if (hydrationPromise) return hydrationPromise;

  // Start hydration attempt
  hydrationPromise = (async () => {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const savedData = await loadEventData();
        
        if (savedData) {
          // Blob data found - load it
          lastLoadedSavedAt = savedData.savedAt;
          femaleGuests = savedData.femaleGuests || [];
          maleGuests = savedData.maleGuests || [];
          slides = savedData.slides || [...defaultSlideSlots];
          if (savedData.eventState) {
            eventState = { ...eventState, ...savedData.eventState, lastUpdated: Date.now() };
          }
          hydrationSuccessful = true;
          return;
        } else {
          // No Blob data found (first deployment or empty) - this is OK, allow saves with defaults
          hydrationSuccessful = true;
          return;
        }
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await delay(500 * attempt); // Exponential backoff: 500ms, 1000ms, 1500ms
        }
      }
    }
    
    // All retries failed - clear promise so NEXT call can retry (not permanently locked!)
    hydrationPromise = null;
    throw new Error(`Hydration failed after ${maxRetries} retries: ${lastError?.message}`);
  })();

  return hydrationPromise;
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
      vcr1IntroUrl: eventState.vcr1IntroUrl,
      vcr2IntroUrl: eventState.vcr2IntroUrl,
      vcrPlayingIntro: eventState.vcrPlayingIntro,
      message: eventState.message,
      // These are Director-controlled but Stage needs them for display
      showingProfile: eventState.showingProfile,
      showingTag: eventState.showingTag,
    },
  };
}

// IMMEDIATE save - for all state changes
// Returns a promise that resolves when save is complete
// CRITICAL: Uses mutex lock to prevent concurrent writes from stomping each other
// CRITICAL: Hydrates ONCE on cold start, but does NOT refresh during writes (would lose local changes)
// CRITICAL: Blocks saves if hydration failed (prevents empty state from overwriting good data)
// NEW: Updates lastLoadedSavedAt BEFORE Blob write so SSE can push immediately
export async function triggerSaveImmediate(): Promise<void> {
  // Generate new savedAt timestamp IMMEDIATELY (before async operations)
  // This allows notifySubscribers() to send the correct timestamp right away
  const newSavedAt = Date.now();
  lastLoadedSavedAt = newSavedAt;
  
  // Notify SSE subscribers IMMEDIATELY (same-instance, instant push)
  notifySubscribers();
  
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
    // Use the pre-generated savedAt for consistency
    await saveEventDataWithTimestamp(dataToSave, newSavedAt);
  }).catch(err => {
    // Log but don't break the lock chain
    console.error('[Persist] saveLock error:', err);
    throw err;
  });
  // Don't await - let Blob write happen in background for faster response
  // return saveLock;  // Commented out - fire and forget
}

// Subscribers for SSE - now includes savedAt for change detection
type Subscriber = (data: EventDataWithSavedAt) => void;
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
      
      // Also update in-memory state to keep it in sync (for write operations)
      if (savedData.savedAt > lastLoadedSavedAt) {
        lastLoadedSavedAt = savedData.savedAt;
        femaleGuests = savedData.femaleGuests || [];
        maleGuests = savedData.maleGuests || [];
        slides = savedData.slides || [...defaultSlideSlots];
        eventState = blobEventState;
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
    'currentFemaleIntro', 'currentSlide', 'vcrPlaying', 'vcrType', 'message',
    'showingProfile', 'showingTag'
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

export async function resetEvent(): Promise<void> {
  eventState = { ...initialEventState, lastUpdated: Date.now() };
  notifySubscribers();
  await triggerSaveImmediate();  // Persist to Blob so SSE clients see the reset
}

// SSE subscription management
export function subscribe(callback: Subscriber): () => void {
  subscribers.add(callback);
  // Immediately send current state with savedAt
  callback({
    ...getEventData(),
    savedAt: lastLoadedSavedAt,
  });
  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
  };
}

function notifySubscribers(): void {
  const data: EventDataWithSavedAt = {
    ...getEventData(),
    savedAt: lastLoadedSavedAt,
  };
  subscribers.forEach((callback) => {
    try {
      callback(data);
    } catch (e) {
      console.error('Error notifying subscriber:', e);
    }
  });
}
