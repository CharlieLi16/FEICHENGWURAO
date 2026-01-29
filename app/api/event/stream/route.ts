import { NextRequest } from 'next/server';
import { getEventData } from '@/lib/event-store';

// SSE endpoint for real-time updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  let intervalId: NodeJS.Timeout | null = null;
  let lastUpdated = 0;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initialData = getEventData();
      lastUpdated = initialData.state.lastUpdated;
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      );

      // Poll for updates every 100ms (more responsive than typical polling)
      intervalId = setInterval(() => {
        try {
          const data = getEventData();
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
      }, 100);
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
