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
        const data = await response.json();
        if (data) {
          setEventData(data);
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
  const updateState = useCallback(async (updates: Partial<EventState>) => {
    return executeOperation(async () => {
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
      
      const response = await fetchWithRetry('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateState', updates: mutuallyExclusiveUpdates }),
      });
      return response.ok;
    });
  }, [executeOperation]);

  const setLight = useCallback(async (guestId: number, status: 'on' | 'off' | 'burst') => {
    return executeOperation(async () => {
      const response = await fetchWithRetry('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setLight', guestId, status }),
      });
      return response.ok;
    });
  }, [executeOperation]);

  const resetLights = useCallback(async () => {
    return executeOperation(async () => {
      const response = await fetchWithRetry('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetLights' }),
      });
      return response.ok;
    });
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
    updateState,
    setLight,
    resetLights,
    resetEvent,
    showSlide,
    hideSlide,
    forceRefresh,
  };
}
