'use client';

import { useState, useEffect, useCallback } from 'react';
import { EventData, EventState, initialEventState, defaultSlideSlots } from '@/lib/event-state';

export function useEventStream() {
  const [eventData, setEventData] = useState<EventData>({
    state: initialEventState,
    femaleGuests: [],
    maleGuests: [],
    slides: defaultSlideSlots,
  });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource('/api/event/stream');

        eventSource.onopen = () => {
          setConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as EventData;
            setEventData(data);
          } catch (e) {
            console.error('Error parsing event data:', e);
          }
        };

        eventSource.onerror = () => {
          setConnected(false);
          setError('连接断开，正在重连...');
          eventSource?.close();
          // Reconnect after 2 seconds
          reconnectTimeout = setTimeout(connect, 2000);
        };
      } catch (e) {
        setError('无法连接服务器');
        reconnectTimeout = setTimeout(connect, 2000);
      }
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Actions to update state
  // Automatically handles mutual exclusivity for fullscreen overlays
  const updateState = useCallback(async (updates: Partial<EventState>) => {
    try {
      // Mutual exclusivity: when one fullscreen state is activated, clear others
      const mutuallyExclusiveUpdates = { ...updates };
      
      // If setting currentFemaleIntro → clear VCR and slides
      if (updates.currentFemaleIntro !== undefined && updates.currentFemaleIntro !== null) {
        mutuallyExclusiveUpdates.vcrPlaying = false;
        mutuallyExclusiveUpdates.currentSlide = null;
      }
      
      // If starting VCR → clear female intro and slides
      if (updates.vcrPlaying === true) {
        mutuallyExclusiveUpdates.currentFemaleIntro = null;
        mutuallyExclusiveUpdates.currentSlide = null;
      }
      
      // If showing slide → clear female intro and VCR
      if (updates.currentSlide !== undefined && updates.currentSlide !== null) {
        mutuallyExclusiveUpdates.currentFemaleIntro = null;
        mutuallyExclusiveUpdates.vcrPlaying = false;
      }
      
      const response = await fetch('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateState', updates: mutuallyExclusiveUpdates }),
      });
      return response.ok;
    } catch (e) {
      console.error('Error updating state:', e);
      return false;
    }
  }, []);

  const setLight = useCallback(async (guestId: number, status: 'on' | 'off' | 'burst') => {
    try {
      const response = await fetch('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setLight', guestId, status }),
      });
      return response.ok;
    } catch (e) {
      console.error('Error setting light:', e);
      return false;
    }
  }, []);

  const resetLights = useCallback(async () => {
    try {
      const response = await fetch('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetLights' }),
      });
      return response.ok;
    } catch (e) {
      console.error('Error resetting lights:', e);
      return false;
    }
  }, []);

  const resetEvent = useCallback(async () => {
    try {
      const response = await fetch('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetEvent' }),
      });
      return response.ok;
    } catch (e) {
      console.error('Error resetting event:', e);
      return false;
    }
  }, []);

  const showSlide = useCallback(async (slideId: string) => {
    // Use updateState to get mutual exclusivity with other fullscreen states
    return updateState({ currentSlide: slideId });
  }, [updateState]);

  const hideSlide = useCallback(async () => {
    return updateState({ currentSlide: null });
  }, [updateState]);

  return {
    ...eventData,
    connected,
    error,
    updateState,
    setLight,
    resetLights,
    resetEvent,
    showSlide,
    hideSlide,
  };
}
