import { NextRequest, NextResponse } from 'next/server';
import { extractPresentationId, fetchPresentation, PresentationInfo } from '@/lib/google-slides';
import { put, head, del } from '@vercel/blob';

const BLOB_PATH = 'google-slides/config.json';

interface SlidesConfig {
  presentationUrl: string;
  presentationId: string;
  presentation: PresentationInfo | null;
  lastUpdated: number;
}

// GET - Get current Google Slides configuration
export async function GET() {
  try {
    const blobInfo = await head(BLOB_PATH);
    if (!blobInfo) {
      return NextResponse.json({ configured: false });
    }

    const response = await fetch(blobInfo.url);
    if (!response.ok) {
      return NextResponse.json({ configured: false });
    }

    const config: SlidesConfig = await response.json();
    return NextResponse.json({
      configured: true,
      ...config,
    });
  } catch (error) {
    console.error('Failed to load Google Slides config:', error);
    return NextResponse.json({ configured: false });
  }
}

// POST - Set Google Slides URL and sync
export async function POST(request: NextRequest) {
  try {
    const { url, action } = await request.json();
    
    // Action: sync - Re-fetch slides from existing config
    if (action === 'sync') {
      const blobInfo = await head(BLOB_PATH);
      if (!blobInfo) {
        return NextResponse.json({ error: 'No presentation configured' }, { status: 400 });
      }
      
      const existingResponse = await fetch(blobInfo.url);
      const existingConfig: SlidesConfig = await existingResponse.json();
      
      if (!existingConfig.presentationId) {
        return NextResponse.json({ error: 'No presentation ID' }, { status: 400 });
      }
      
      const presentation = await fetchPresentation(existingConfig.presentationId);
      if (!presentation) {
        return NextResponse.json({ error: 'Failed to fetch presentation' }, { status: 500 });
      }
      
      const newConfig: SlidesConfig = {
        ...existingConfig,
        presentation,
        lastUpdated: Date.now(),
      };
      
      // Delete old and save new
      await del(blobInfo.url);
      await put(BLOB_PATH, JSON.stringify(newConfig, null, 2), {
        access: 'public',
        contentType: 'application/json',
      });
      
      return NextResponse.json({
        success: true,
        presentation,
        slideCount: presentation.slides.length,
      });
    }
    
    // Action: set URL - Configure new presentation
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    const presentationId = extractPresentationId(url);
    if (!presentationId) {
      return NextResponse.json({ error: 'Invalid Google Slides URL' }, { status: 400 });
    }
    
    // Check if API key is configured
    if (!process.env.GOOGLE_API_KEY) {
      // Without API key, we can still try to use direct export URLs
      // This works for publicly shared presentations
      console.log('[GoogleSlides] No API key, using direct export URLs');
      
      const config: SlidesConfig = {
        presentationUrl: url,
        presentationId,
        presentation: {
          presentationId,
          title: 'Presentation',
          slides: Array.from({ length: 12 }, (_, i) => ({
            slideId: `slide-${i + 1}`,
            pageNumber: i + 1,
            imageUrl: `https://docs.google.com/presentation/d/${presentationId}/export/png?pageid=p${i}`,
          })),
          lastSynced: Date.now(),
        },
        lastUpdated: Date.now(),
      };
      
      // Delete old config if exists
      try {
        const existing = await head(BLOB_PATH);
        if (existing) await del(existing.url);
      } catch {}
      
      await put(BLOB_PATH, JSON.stringify(config, null, 2), {
        access: 'public',
        contentType: 'application/json',
      });
      
      return NextResponse.json({
        success: true,
        presentationId,
        message: 'Configured without API key - using direct export',
        slideCount: 12,
      });
    }
    
    // Fetch presentation with API
    const presentation = await fetchPresentation(presentationId);
    if (!presentation) {
      return NextResponse.json({ 
        error: 'Failed to fetch presentation. Make sure it is shared as "Anyone with the link can view"' 
      }, { status: 400 });
    }
    
    const config: SlidesConfig = {
      presentationUrl: url,
      presentationId,
      presentation,
      lastUpdated: Date.now(),
    };
    
    // Delete old config if exists
    try {
      const existing = await head(BLOB_PATH);
      if (existing) await del(existing.url);
    } catch {}
    
    await put(BLOB_PATH, JSON.stringify(config, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });
    
    return NextResponse.json({
      success: true,
      presentationId,
      title: presentation.title,
      slideCount: presentation.slides.length,
    });
    
  } catch (error) {
    console.error('Failed to configure Google Slides:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Remove Google Slides configuration
export async function DELETE() {
  try {
    const existing = await head(BLOB_PATH);
    if (existing) {
      await del(existing.url);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete config:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
