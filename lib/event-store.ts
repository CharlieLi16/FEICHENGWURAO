// In-memory event state store (for serverless, consider using Vercel KV or similar)

import { EventState, EventData, FemaleGuest, MaleGuest, initialEventState } from './event-state';

// Global state (works in development, for production use Vercel KV)
let eventState: EventState = { ...initialEventState };
let femaleGuests: FemaleGuest[] = [];
let maleGuests: MaleGuest[] = [];

// Subscribers for SSE
type Subscriber = (data: EventData) => void;
const subscribers: Set<Subscriber> = new Set();

export function getEventData(): EventData {
  return {
    state: eventState,
    femaleGuests,
    maleGuests,
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
  notifySubscribers();
}

export function setMaleGuests(guests: MaleGuest[]): void {
  maleGuests = guests;
  notifySubscribers();
}

export function getFemaleGuests(): FemaleGuest[] {
  return femaleGuests;
}

export function getMaleGuests(): MaleGuest[] {
  return maleGuests;
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
