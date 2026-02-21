import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';

// Delete a blob by URL
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }
    
    // Only delete Vercel Blob URLs (not external URLs like YouTube)
    if (!url.includes('blob.vercel-storage.com')) {
      console.log('[Blob Delete] Skipping non-blob URL:', url);
      return NextResponse.json({ success: true, skipped: true });
    }
    
    await del(url);
    console.log('[Blob Delete] Deleted:', url);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Blob Delete] Error:', error);
    // Don't fail the request if delete fails - old blob will eventually be cleaned up
    return NextResponse.json({ success: false, error: String(error) });
  }
}
