import { NextRequest, NextResponse } from 'next/server';
import { 
  getEventDataAsync, 
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

// GET - Retrieve current event state (loads from Blob on first request)
export async function GET() {
  const data = await getEventDataAsync();
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
        const newState = updateEventState(updates);
        return NextResponse.json({ success: true, state: newState });

      case 'setLight':
        const { guestId, status } = params;
        const stateAfterLight = setLight(guestId, status);
        return NextResponse.json({ success: true, state: stateAfterLight });

      case 'resetLights':
        const stateAfterReset = resetLights();
        return NextResponse.json({ success: true, state: stateAfterReset });

      case 'resetEvent':
        resetEvent();
        return NextResponse.json({ success: true });

      case 'setFemaleGuests':
        setFemaleGuests(params.guests as FemaleGuest[]);
        return NextResponse.json({ success: true });

      case 'setMaleGuests':
        setMaleGuests(params.guests as MaleGuest[]);
        return NextResponse.json({ success: true });

      case 'setSlides':
        setSlides(params.slides as SlideSlot[]);
        return NextResponse.json({ success: true });

      case 'updateSlide':
        updateSlide(params.slideId, params.imageUrl);
        return NextResponse.json({ success: true });

      case 'showSlide':
        const stateAfterSlide = updateEventState({ currentSlide: params.slideId || null });
        return NextResponse.json({ success: true, state: stateAfterSlide });

      case 'hideSlide':
        const stateAfterHide = updateEventState({ currentSlide: null });
        return NextResponse.json({ success: true, state: stateAfterHide });

      case 'setStageBackground':
        const stateAfterBg = updateEventState({ stageBackground: params.url || undefined });
        return NextResponse.json({ success: true, state: stateAfterBg });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating event state:', error);
    return NextResponse.json({ error: 'Failed to update state' }, { status: 500 });
  }
}
