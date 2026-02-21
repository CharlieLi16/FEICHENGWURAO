'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { EventData, EventState, initialEventState, defaultSlideSlots } from '@/lib/event-state';

// Operation status for Toast feedback
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with timeout and retry
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries = 3,
  timeoutMs = 5000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // Server error, retry
      lastError = new Error(`HTTP ${response.status}`);
    } catch (e) {
      lastError = e as Error;
      
      // Don't retry on abort (timeout)
      if ((e as Error).name === 'AbortError') {
        console.warn(`Request timeout (attempt ${attempt + 1}/${retries})`);
      }
    }
    
    // Wait before retry (except last attempt)
    if (attempt < retries - 1) {
      await delay(500);
    }
  }
  
  throw lastError || new Error('Request failed');
}

// Extended type that includes savedAt from server
interface EventDataWithSavedAt extends EventData {
  savedAt?: number;
}

export function useEventStream() {
  const [eventData, setEventData] = useState<EventData>({
    state: initialEventState,
    femaleGuests: [],
    maleGuests: [],
    slides: defaultSlideSlots,
  });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<OperationStatus>('idle');
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  // Track server's savedAt timestamp (useful for staleness detection)
  const [serverSavedAt, setServerSavedAt] = useState<number>(0);
  
  // Ref to track if we should show operation status
  const operationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let countdownInterval: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        setReconnectCountdown(null);
        if (countdownInterval) clearInterval(countdownInterval);
        
        eventSource = new EventSource('/api/event/stream');

        eventSource.onopen = () => {
          setConnected(true);
          setError(null);
          setReconnectCountdown(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as EventDataWithSavedAt;
            // Extract and track savedAt separately
            const { savedAt, ...eventDataOnly } = data;
            if (savedAt) {
              setServerSavedAt(savedAt);
            }
            setEventData(eventDataOnly);
          } catch (e) {
            console.error('Error parsing event data:', e);
          }
        };

        eventSource.onerror = () => {
          setConnected(false);
          setError('连接断开，正在重连...');
          eventSource?.close();
          
          // Start countdown
          let countdown = 2;
          setReconnectCountdown(countdown);
          countdownInterval = setInterval(() => {
            countdown -= 1;
            setReconnectCountdown(countdown);
            if (countdown <= 0) {
              clearInterval(countdownInterval!);
            }
          }, 1000);
          
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
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, []);

  // Helper to execute operation with status tracking
  const executeOperation = useCallback(async (
    operation: () => Promise<boolean>
  ): Promise<boolean> => {
    // Clear any pending status reset
    if (operationTimeoutRef.current) {
      clearTimeout(operationTimeoutRef.current);
    }
    
    setOperationStatus('loading');
    
    try {
      const success = await operation();
      setOperationStatus(success ? 'success' : 'error');
      
      // Reset status after 2 seconds
      operationTimeoutRef.current = setTimeout(() => {
        setOperationStatus('idle');
      }, 2000);
      
      return success;
    } catch (e) {
      console.error('Operation failed:', e);
      setOperationStatus('error');
      
      operationTimeoutRef.current = setTimeout(() => {
        setOperationStatus('idle');
      }, 3000);
      
      return false;
    }
  }, []);

  // Force refresh state from server
  const forceRefresh = useCallback(async () => {
    return executeOperation(async () => {
      try {
        const response = await fetchWithRetry(
          '/api/event/state',
          { method: 'GET' }
        );
        const data = await response.json() as EventDataWithSavedAt;
        if (data) {
          // Extract and track savedAt separately
          const { savedAt, ...eventDataOnly } = data;
          if (savedAt) {
            setServerSavedAt(savedAt);
          }
          setEventData(eventDataOnly);
          return true;
        }
        return false;
      } catch (e) {
        console.error('Force refresh failed:', e);
        return false;
      }
    });
  }, [executeOperation]);

  // Actions to update state
  // Automatically handles mutual exclusivity for fullscreen overlays
  // Uses optimistic updates for immediate UI response, with rollback on failure
  const updateState = useCallback(async (updates: Partial<EventState>) => {
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
    
    // Save previous state for rollback
    let previousState: EventState | null = null;
    setEventData(prev => {
      previousState = prev.state;
      return {
        ...prev,
        state: { ...prev.state, ...mutuallyExclusiveUpdates, lastUpdated: Date.now() }
      };
    });
    
    // Send to server
    const success = await executeOperation(async () => {
      const response = await fetchWithRetry('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateState', updates: mutuallyExclusiveUpdates }),
      });
      return response.ok;
    });
    
    // Rollback on failure
    if (!success && previousState) {
      setEventData(prev => ({ ...prev, state: previousState! }));
    }
    
    return success;
  }, [executeOperation]);

  const setLight = useCallback(async (guestId: number, status: 'on' | 'off' | 'burst') => {
    // Save previous lights for rollback
    let previousLights: Record<number, 'on' | 'off' | 'burst'> | null = null;
    setEventData(prev => {
      previousLights = prev.state.lights;
      return {
        ...prev,
        state: {
          ...prev.state,
          lights: { ...prev.state.lights, [guestId]: status },
          lastUpdated: Date.now(),
        }
      };
    });
    
    const success = await executeOperation(async () => {
      const response = await fetchWithRetry('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setLight', guestId, status }),
      });
      return response.ok;
    });
    
    // Rollback on failure
    if (!success && previousLights) {
      setEventData(prev => ({
        ...prev,
        state: { ...prev.state, lights: previousLights! }
      }));
    }
    
    return success;
  }, [executeOperation]);

  const resetLights = useCallback(async () => {
    // Save previous lights for rollback
    let previousLights: Record<number, 'on' | 'off' | 'burst'> | null = null;
    setEventData(prev => {
      previousLights = prev.state.lights;
      return {
        ...prev,
        state: {
          ...prev.state,
          lights: {
            1: 'on', 2: 'on', 3: 'on', 4: 'on',
            5: 'on', 6: 'on', 7: 'on', 8: 'on',
            9: 'on', 10: 'on', 11: 'on', 12: 'on',
          },
          lastUpdated: Date.now(),
        }
      };
    });
    
    const success = await executeOperation(async () => {
      const response = await fetchWithRetry('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetLights' }),
      });
      return response.ok;
    });
    
    // Rollback on failure
    if (!success && previousLights) {
      setEventData(prev => ({
        ...prev,
        state: { ...prev.state, lights: previousLights! }
      }));
    }
    
    return success;
  }, [executeOperation]);

  const resetEvent = useCallback(async () => {
    return executeOperation(async () => {
      const response = await fetchWithRetry('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetEvent' }),
      });
      return response.ok;
    });
  }, [executeOperation]);

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
    operationStatus,
    reconnectCountdown,
    serverSavedAt,  // Blob's savedAt timestamp (for staleness detection)
    updateState,
    setLight,
    resetLights,
    resetEvent,
    showSlide,
    hideSlide,
    forceRefresh,
  };
}
