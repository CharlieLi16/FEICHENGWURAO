import { NextRequest } from 'next/server';
import { getEventDataFresh } from '@/lib/event-store';

// SSE endpoint for real-time updates
// Polls Blob directly to ensure cross-instance consistency
export async function GET(request: NextRequest) {
  // Load fresh data from Blob before starting stream
  const initialData = await getEventDataFresh();
  
  const encoder = new TextEncoder();
  
  let intervalId: ReturnType<typeof setInterval> | null = null;
  // Use savedAt (Blob timestamp) for change detection - strictly increasing and reliable
  // (lastUpdated can change even when content is the same, causing unnecessary pushes)
  let lastSavedAt = initialData.savedAt;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state (already loaded) - include savedAt for client to track
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      );

      // Poll Blob every 200ms for cross-instance updates
      // (More reliable than in-memory polling across serverless instances)
      intervalId = setInterval(async () => {
        try {
          const data = await getEventDataFresh();  // Always read from Blob
          // Only send if Blob data has actually changed (savedAt is strictly increasing)
          if (data.savedAt > lastSavedAt) {
            lastSavedAt = data.savedAt;
            // Include savedAt - client can use it for staleness checks
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        } catch (e) {
          console.error('SSE error:', e);
        }
      }, 200);  // 200ms - faster updates at slight cost increase
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
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
