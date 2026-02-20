// Google Slides integration utilities
// We use iframe embed, so no API key needed - just URL extraction

export interface PresentationInfo {
  presentationId: string;
  title: string;
  slideCount: number;
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

// Generate embed URL for a specific slide
export function getEmbedUrl(presentationId: string, slideNumber: number): string {
  return `https://docs.google.com/presentation/d/${presentationId}/embed?rm=minimal&start=false&loop=false&slide=${slideNumber}`;
}
