// In-memory event state store with Vercel Blob persistence

import { EventState, EventData, FemaleGuest, MaleGuest, SlideSlot, initialEventState, defaultSlideSlots } from './event-state';
import { loadEventData, debouncedSave } from './event-persist';

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
        // Restore stage background settings
        if (savedData.stageBackground) {
          eventState.stageBackground = savedData.stageBackground;
        }
        if (savedData.backgroundBlur !== undefined) {
          eventState.backgroundBlur = savedData.backgroundBlur;
        }
        console.log('[EventStore] Restored data:', {
          femaleGuests: femaleGuests.length,
          maleGuests: maleGuests.length,
          slides: slides.length,
          stageBackground: !!savedData.stageBackground,
          backgroundBlur: savedData.backgroundBlur,
        });
      }
    } catch (error) {
      console.error('[EventStore] Failed to load persisted data:', error);
    }
    isInitialized = true;
  })();
  
  await initPromise;
}

// Trigger debounced save
function triggerSave(): void {
  debouncedSave({ 
    femaleGuests, 
    maleGuests, 
    slides,
    stageBackground: eventState.stageBackground,
    backgroundBlur: eventState.backgroundBlur,
  });
}

// Subscribers for SSE
type Subscriber = (data: EventData) => void;
const subscribers: Set<Subscriber> = new Set();

export async function getEventDataAsync(): Promise<EventData> {
  await ensureInitialized();
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
  // Persist if background settings changed
  if ('stageBackground' in updates || 'backgroundBlur' in updates) {
    triggerSave();
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
  return eventState;
}

export function setFemaleGuests(guests: FemaleGuest[]): void {
  femaleGuests = guests;
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  triggerSave();
}

export function setMaleGuests(guests: MaleGuest[]): void {
  maleGuests = guests;
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  triggerSave();
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
  triggerSave();
}

export function updateSlide(slideId: string, imageUrl: string | null): void {
  slides = slides.map(slide => 
    slide.id === slideId ? { ...slide, imageUrl: imageUrl || undefined } : slide
  );
  // Update timestamp to trigger SSE push
  eventState = { ...eventState, lastUpdated: Date.now() };
  notifySubscribers();
  triggerSave();
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
