import { NextRequest, NextResponse } from 'next/server';
import { 
  getEventData, 
  updateEventState, 
  setLight, 
  resetLights, 
  resetEvent,
  setFemaleGuests,
  setMaleGuests
} from '@/lib/event-store';
import { EventState, FemaleGuest, MaleGuest } from '@/lib/event-state';

// GET - Retrieve current event state
export async function GET() {
  const data = getEventData();
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

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating event state:', error);
    return NextResponse.json({ error: 'Failed to update state' }, { status: 500 });
  }
}
