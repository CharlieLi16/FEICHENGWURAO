// Google Slides API integration
// Requires GOOGLE_API_KEY environment variable

export interface SlideInfo {
  slideId: string;
  pageNumber: number;
  thumbnailUrl?: string;
  imageUrl?: string;
}

export interface PresentationInfo {
  presentationId: string;
  title: string;
  slides: SlideInfo[];
  lastSynced: number;
}

// Extract presentation ID from various Google Slides URL formats
export function extractPresentationId(url: string): string | null {
  // Format 1: https://docs.google.com/presentation/d/PRESENTATION_ID/edit
  // Format 2: https://docs.google.com/presentation/d/PRESENTATION_ID/
  // Format 3: Just the ID itself
  
  const patterns = [
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{20,})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Fetch presentation metadata from Google Slides API
export async function fetchPresentation(presentationId: string): Promise<PresentationInfo | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.error('[GoogleSlides] GOOGLE_API_KEY not configured');
    return null;
  }
  
  try {
    // Fetch presentation metadata
    const response = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}?key=${apiKey}`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[GoogleSlides] API error:', error);
      return null;
    }
    
    const data = await response.json();
    
    // Extract slide info
    const slides: SlideInfo[] = (data.slides || []).map((slide: { objectId: string }, index: number) => ({
      slideId: slide.objectId,
      pageNumber: index + 1,
      // Thumbnail URL using Google Slides export
      thumbnailUrl: `https://docs.google.com/presentation/d/${presentationId}/export/png?id=${presentationId}&pageid=${slide.objectId}`,
      imageUrl: `https://docs.google.com/presentation/d/${presentationId}/export/png?id=${presentationId}&pageid=${slide.objectId}`,
    }));
    
    return {
      presentationId,
      title: data.title || 'Untitled',
      slides,
      lastSynced: Date.now(),
    };
  } catch (error) {
    console.error('[GoogleSlides] Failed to fetch presentation:', error);
    return null;
  }
}

// Get direct image URL for a slide (using Google's export feature)
// Note: This works for publicly shared presentations
export function getSlideImageUrl(presentationId: string, slideId: string): string {
  return `https://docs.google.com/presentation/d/${presentationId}/export/png?id=${presentationId}&pageid=${slideId}`;
}

// Alternative: Get slide as JPEG (smaller file size)
export function getSlideImageUrlJpeg(presentationId: string, pageNumber: number): string {
  return `https://docs.google.com/presentation/d/${presentationId}/export/jpeg?id=${presentationId}&pageIndex=${pageNumber - 1}`;
}
