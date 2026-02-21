import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { getEventDataFresh } from '@/lib/event-store';

// List all blobs and identify unused ones
export async function GET() {
  try {
    // Get all blobs
    const { blobs } = await list();
    
    // Get current event data to find URLs in use
    const eventData = await getEventDataFresh();
    
    // Collect all URLs currently in use
    const usedUrls = new Set<string>();
    
    // Add URLs from female guests
    eventData.femaleGuests.forEach(g => {
      if (g.photo) usedUrls.add(g.photo);
      g.photos?.forEach(p => usedUrls.add(p));
    });
    
    // Add URLs from male guests
    eventData.maleGuests.forEach(g => {
      if (g.vcr1Url) usedUrls.add(g.vcr1Url);
      if (g.vcr2Url) usedUrls.add(g.vcr2Url);
    });
    
    // Add stage background
    if (eventData.state.stageBackground) {
      usedUrls.add(eventData.state.stageBackground);
    }
    
    // Add slide images
    eventData.slides.forEach(s => {
      if (s.imageUrl) usedUrls.add(s.imageUrl);
    });
    
    // Categorize blobs
    const used: typeof blobs = [];
    const unused: typeof blobs = [];
    
    blobs.forEach(blob => {
      // Skip the state.json file
      if (blob.pathname.includes('state.json')) {
        used.push(blob);
      } else if (usedUrls.has(blob.url)) {
        used.push(blob);
      } else {
        unused.push(blob);
      }
    });
    
    return NextResponse.json({
      total: blobs.length,
      used: used.length,
      unused: unused.length,
      unusedBlobs: unused.map(b => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      })),
      usedBlobs: used.map(b => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
      })),
    });
  } catch (error) {
    console.error('[Blob List] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE - Clean up unused blobs
export async function DELETE() {
  try {
    // Get all blobs
    const { blobs } = await list();
    
    // Get current event data
    const eventData = await getEventDataFresh();
    
    // Collect used URLs
    const usedUrls = new Set<string>();
    
    eventData.femaleGuests.forEach(g => {
      if (g.photo) usedUrls.add(g.photo);
      g.photos?.forEach(p => usedUrls.add(p));
    });
    
    eventData.maleGuests.forEach(g => {
      if (g.vcr1Url) usedUrls.add(g.vcr1Url);
      if (g.vcr2Url) usedUrls.add(g.vcr2Url);
    });
    
    if (eventData.state.stageBackground) {
      usedUrls.add(eventData.state.stageBackground);
    }
    
    eventData.slides.forEach(s => {
      if (s.imageUrl) usedUrls.add(s.imageUrl);
    });
    
    // Delete unused blobs
    const deleted: string[] = [];
    const errors: string[] = [];
    
    for (const blob of blobs) {
      // Skip state.json
      if (blob.pathname.includes('state.json')) continue;
      
      if (!usedUrls.has(blob.url)) {
        try {
          await del(blob.url);
          deleted.push(blob.pathname);
        } catch (e) {
          errors.push(`${blob.pathname}: ${e}`);
        }
      }
    }
    
    return NextResponse.json({
      deleted: deleted.length,
      deletedPaths: deleted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Blob Cleanup] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
