import { NextRequest, NextResponse } from 'next/server';
import { 
  getEventDataFresh, 
  updateEventState, 
  setLight, 
  resetLights, 
  resetEvent,
  setFemaleGuests,
  setMaleGuests,
  setSlides,
  updateSlide
} from '@/lib/event-store';
import { EventState, FemaleGuest, MaleGuest, SlideSlot } from '@/lib/event-state';

// GET - Retrieve current event state (always fresh from Blob for consistency)
export async function GET() {
  const data = await getEventDataFresh();
  return NextResponse.json(data);
}

// POST - Update event state
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'updateState':
        const updates = params.updates as Partial<EventState>;
        const newState = await updateEventState(updates);  // Wait for Blob save
        return NextResponse.json({ success: true, state: newState });

      case 'setLight':
        const { guestId, status } = params;
        const stateAfterLight = await setLight(guestId, status);  // Wait for Blob save
        return NextResponse.json({ success: true, state: stateAfterLight });

      case 'resetLights':
        const stateAfterReset = await resetLights();  // Wait for Blob save
        return NextResponse.json({ success: true, state: stateAfterReset });

      case 'resetEvent':
        await resetEvent();  // Wait for Blob save
        return NextResponse.json({ success: true });

      case 'setFemaleGuests':
        await setFemaleGuests(params.guests as FemaleGuest[]);  // Wait for Blob save
        return NextResponse.json({ success: true });

      case 'setMaleGuests':
        await setMaleGuests(params.guests as MaleGuest[]);  // Wait for Blob save
        return NextResponse.json({ success: true });

      case 'setSlides':
        await setSlides(params.slides as SlideSlot[]);
        return NextResponse.json({ success: true });

      case 'updateSlide':
        await updateSlide(params.slideId, params.imageUrl);
        return NextResponse.json({ success: true });

      case 'showSlide':
        const stateAfterSlide = await updateEventState({ currentSlide: params.slideId || null });
        return NextResponse.json({ success: true, state: stateAfterSlide });

      case 'hideSlide':
        const stateAfterHide = await updateEventState({ currentSlide: null });
        return NextResponse.json({ success: true, state: stateAfterHide });

      case 'setStageBackground':
        const stateAfterBg = await updateEventState({ stageBackground: params.url || undefined });
        return NextResponse.json({ success: true, state: stateAfterBg });

      case 'refresh':
        // Force save and return fresh data - triggers SSE broadcast to all clients
        const refreshState = await updateEventState({ lastUpdated: Date.now() });
        const freshData = await getEventDataFresh();
        return NextResponse.json({ 
          success: true, 
          state: refreshState,
          ...freshData  // Include full data for the caller
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating event state:', error);
    // Return specific error for blocked writes
    if (error instanceof Error && error.message.startsWith('BLOCKED:')) {
      return NextResponse.json({ 
        error: error.message,
        blocked: true 
      }, { status: 409 });  // 409 Conflict
    }
    return NextResponse.json({ error: 'Failed to update state' }, { status: 500 });
  }
}
