import { NextRequest } from 'next/server';
import { getEventDataFresh, subscribe, EventDataWithSavedAt } from '@/lib/event-store';

// SSE endpoint for real-time updates
// Uses TWO mechanisms for reliability:
// 1. In-memory subscription (instant updates for same-instance)
// 2. Blob polling (cross-instance consistency fallback)
export async function GET(request: NextRequest) {
  // Load fresh data from Blob before starting stream
  const initialData = await getEventDataFresh();
  
  const encoder = new TextEncoder();
  
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  // Use savedAt for change detection - strictly increasing and reliable
  let lastSavedAt = initialData.savedAt;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state (already loaded)
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      );

      // === INSTANT UPDATES: Subscribe to in-memory changes ===
      // When POST happens on same instance, we get notified immediately
      unsubscribe = subscribe((data: EventDataWithSavedAt) => {
        // Only send if newer than what we've sent
        if (data.savedAt > lastSavedAt) {
          lastSavedAt = data.savedAt;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } catch (e) {
            // Stream may be closed
          }
        }
      });

      // === CROSS-INSTANCE FALLBACK: Poll Blob every 500ms ===
      // Catches updates from other serverless instances
      intervalId = setInterval(async () => {
        try {
          const data = await getEventDataFresh();
          if (data.savedAt > lastSavedAt) {
            lastSavedAt = data.savedAt;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 500);  // 500ms for cross-instance (instant updates handle same-instance)
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
