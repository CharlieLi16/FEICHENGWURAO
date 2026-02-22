import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

const BLOB_PATH = 'event-data/state.json';

// Debug endpoint to see what's actually in Blob
// GET /api/debug/blob
export async function GET() {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH });
    
    console.log('[Debug] Found blobs:', blobs.length);
    
    // Show all blobs found (there should only be one)
    const blobInfo = blobs.map(b => ({
      pathname: b.pathname,
      url: b.url,
      uploadedAt: (b as any).uploadedAt,
      size: b.size,
    }));
    
    if (blobs.length === 0) {
      return NextResponse.json({ 
        message: 'No blobs found',
        blobs: [] 
      });
    }
    
    // Fetch the actual content of the first blob
    const response = await fetch(`${blobs[0].url}?t=${Date.now()}`, { 
      cache: 'no-store' 
    });
    const data = await response.json();
    
    return NextResponse.json({
      blobCount: blobs.length,
      blobs: blobInfo,
      content: {
        heartChoice: data.eventState?.heartChoice,
        phase: data.eventState?.phase,
        savedAt: data.savedAt ? new Date(data.savedAt).toISOString() : null,
        maleGuestsCount: data.maleGuests?.length,
        femaleGuestsCount: data.femaleGuests?.length,
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: String(error) 
    }, { status: 500 });
  }
}
