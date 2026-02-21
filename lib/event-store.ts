// In-memory event state store with Vercel Blob persistence

import { EventState, EventData, FemaleGuest, MaleGuest, SlideSlot, initialEventState, defaultSlideSlots } from './event-state';
import { loadEventData, saveEventData } from './event-persist';

// Global state (initialized with defaults, synced from Blob before each write)
let eventState: EventState = { ...initialEventState };
let femaleGuests: FemaleGuest[] = [];
let maleGuests: MaleGuest[] = [];
let slides: SlideSlot[] = [...defaultSlideSlots];

// Track last loaded savedAt to avoid overwriting newer data with older data
let lastLoadedSavedAt = 0;

// Mutex lock for save operations (prevents concurrent writes from stomping each other)
let saveLock: Promise<void> = Promise.resolve();

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
      // Don't persist transient UI state like showingProfile, vcrPlaying, etc.
    },
  };
}

// IMMEDIATE save - for all state changes
// Returns a promise that resolves when save is complete
// CRITICAL: Uses mutex lock to prevent concurrent writes from stomping each other
// CRITICAL: Always syncs from Blob first to prevent cold start empty data overwrites
export async function triggerSaveImmediate(): Promise<void> {
  // Chain onto the save lock to serialize writes within this instance
  // This prevents: A reads V1, B reads V1, A writes V2, B writes V3 (loses A's changes)
  saveLock = saveLock.then(async () => {
    // Sync memory from Blob before writing - prevents cold start overwrites
    await getEventDataFresh();
    const savedAt = await saveEventData(getDataForSave());
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

// Fetch fresh from Blob - ensures consistency across serverless instances
// Only updates memory if Blob data is newer than what we last loaded (prevents overwriting newer local changes)
export async function getEventDataFresh(): Promise<EventData> {
  try {
    const savedData = await loadEventData();
    if (savedData) {
      // Only update memory if Blob data is newer than what we already have
      // This prevents: local update -> refresh -> older Blob overwrites local update
      if (savedData.savedAt > lastLoadedSavedAt) {
        lastLoadedSavedAt = savedData.savedAt;
        
        // Update in-memory state from Blob
        femaleGuests = savedData.femaleGuests || [];
        maleGuests = savedData.maleGuests || [];
        slides = savedData.slides || [...defaultSlideSlots];
        
        if (savedData.eventState) {
          eventState = {
            ...eventState,
            ...savedData.eventState,
            lastUpdated: Date.now(),
          };
        }
        
        console.log('[EventStore] Refreshed from Blob, savedAt:', new Date(savedData.savedAt).toISOString());
      } else {
        console.log('[EventStore] Skipped refresh - local data is newer or same');
      }
    }
  } catch (error) {
    console.error('[EventStore] Failed to refresh from Blob:', error);
  }
  
  return {
    state: eventState,
    femaleGuests,
    maleGuests,
    slides,
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
  const persistKeys = ['phase', 'currentMaleGuest', 'currentRound', 'lights', 'heartChoice', 'stageBackground', 'backgroundBlur', 'useGoogleSlides'];
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
  // Ensure memory is synced with Blob before writing (prevents cold start overwrites)
  await getEventDataFresh();
  
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
  // Ensure memory is synced with Blob before writing (prevents cold start overwrites)
  await getEventDataFresh();
  
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
