import { NextRequest } from 'next/server';
import { getEventDataFresh } from '@/lib/event-store';

// SSE endpoint for real-time updates
// Polls Blob directly to ensure cross-instance consistency
export async function GET(request: NextRequest) {
  // Load fresh data from Blob before starting stream
  const initialData = await getEventDataFresh();
  
  const encoder = new TextEncoder();
  
  let intervalId: NodeJS.Timeout | null = null;
  let lastUpdated = initialData.state.lastUpdated;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state (already loaded)
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      );

      // Poll Blob every 500ms for cross-instance updates
      // (More reliable than in-memory polling across serverless instances)
      intervalId = setInterval(async () => {
        try {
          const data = await getEventDataFresh();  // Always read from Blob
          // Only send if state has changed
          if (data.state.lastUpdated > lastUpdated) {
            lastUpdated = data.state.lastUpdated;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        } catch (e) {
          console.error('SSE error:', e);
        }
      }, 500);  // 500ms - balance between responsiveness and Blob read costs
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
