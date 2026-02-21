// In-memory event state store with Vercel Blob persistence

import { EventState, EventData, FemaleGuest, MaleGuest, SlideSlot, initialEventState, defaultSlideSlots } from './event-state';
import { loadEventData, debouncedSave, saveEventData } from './event-persist';

// Global state
let eventState: EventState = { ...initialEventState };
let femaleGuests: FemaleGuest[] = [];
let maleGuests: MaleGuest[] = [];
let slides: SlideSlot[] = [...defaultSlideSlots];

// Track if we've loaded persisted data
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Initialize from persisted data (called once on first access)
async function ensureInitialized(): Promise<void> {
  if (isInitialized) return;
  
  if (initPromise) {
    await initPromise;
    return;
  }
  
  initPromise = (async () => {
    try {
      const savedData = await loadEventData();
      if (savedData) {
        femaleGuests = savedData.femaleGuests || [];
        maleGuests = savedData.maleGuests || [];
        slides = savedData.slides || [...defaultSlideSlots];
        
        // Restore full event state if available
        if (savedData.eventState) {
          eventState = {
            ...eventState,
            ...savedData.eventState,
            lastUpdated: Date.now(),
          };
        } else {
          // Legacy: restore stage background settings from old format
          if (savedData.stageBackground) {
            eventState.stageBackground = savedData.stageBackground;
          }
          if (savedData.backgroundBlur !== undefined) {
            eventState.backgroundBlur = savedData.backgroundBlur;
          }
        }
        
        console.log('[EventStore] Restored data:', {
          femaleGuests: femaleGuests.length,
          maleGuests: maleGuests.length,
          slides: slides.length,
          phase: eventState.phase,
          currentRound: eventState.currentRound,
          currentMaleGuest: eventState.currentMaleGuest,
        });
      }
    } catch (error) {
      console.error('[EventStore] Failed to load persisted data:', error);
    }
    isInitialized = true;
  })();
  
  await initPromise;
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
      // Don't persist transient UI state like showingProfile, vcrPlaying, etc.
    },
  };
}

// IMMEDIATE save - for runtime state changes (phase, lights, etc.)
// Ensures consistency across serverless instances
function triggerSaveImmediate(): void {
  saveEventData(getDataForSave());
}

// DEBOUNCED save - for guest data (less frequent changes)
// Saves on write costs
function triggerSaveDebounced(): void {
  debouncedSave(getDataForSave());
}

// Subscribers for SSE
type Subscriber = (data: EventData) => void;
const subscribers: Set<Subscriber> = new Set();

// Always fetch fresh from Blob - ensures consistency across serverless instances
export async function getEventDataFresh(): Promise<EventData> {
  try {
    const savedData = await loadEventData();
    if (savedData) {
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

export function updateEventState(updates: Partial<EventState>): EventState {
  eventState = {
    ...eventState,
    ...updates,
    lastUpdated: Date.now(),
  };
  notifySubscribers();
  
  // IMMEDIATE save for runtime state changes - ensures consistency across instances
  const persistKeys = ['phase', 'currentMaleGuest', 'currentRound', 'lights', 'heartChoice', 'stageBackground', 'backgroundBlur', 'useGoogleSlides'];
  if (persistKeys.some(key => key in updates)) {
    triggerSaveImmediate();
  }
  return eventState;
}

export function setLight(guestId: number, status: 'on' | 'off' | 'burst'): EventState {
  eventState = {
    ...eventState,
    lights: {
      ...eventState.lights,
      [guestId]: status,
    },
    lastUpdated: Date.now(),
  };
  notifySubscribers();
  triggerSaveImmediate();  // Immediate save for runtime state
  return eventState;
}

export function resetLights(): EventState {
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
  triggerSaveImmediate();  // Immediate save for runtime state
  return eventState;
}

export function setFemaleGuests(guests: FemaleGuest[]): void {
  // Protection: refuse to overwrite non-empty data with empty data
  const newHasContent = guests.some(g => g.name?.trim());
  const currentHasContent = femaleGuests.some(g => g.name?.trim());
  
  if (currentHasContent && !newHasContent) {
    console.error('[BLOCKED] Refusing to overwrite female guests with empty data');
    return;  // Don't save - protect existing data
  }
  
  femaleGuests = guests;
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  triggerSaveDebounced();  // Debounced save for guest data (less frequent)
}

export function setMaleGuests(guests: MaleGuest[]): void {
  // Protection: refuse to overwrite non-empty data with empty data
  const newHasContent = guests.some(g => g.name?.trim());
  const currentHasContent = maleGuests.some(g => g.name?.trim());
  
  if (currentHasContent && !newHasContent) {
    console.error('[BLOCKED] Refusing to overwrite male guests with empty data');
    return;  // Don't save - protect existing data
  }
  
  maleGuests = guests;
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  triggerSaveDebounced();  // Debounced save for guest data (less frequent)
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

export function setSlides(newSlides: SlideSlot[]): void {
  slides = newSlides;
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  triggerSaveDebounced();  // Debounced save for slides
}

export function updateSlide(slideId: string, imageUrl: string | null): void {
  slides = slides.map(slide => 
    slide.id === slideId ? { ...slide, imageUrl: imageUrl || undefined } : slide
  );
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  triggerSaveDebounced();  // Debounced save for slides
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
