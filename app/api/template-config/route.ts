import { NextRequest, NextResponse } from 'next/server';
import { loadTemplateConfig, saveTemplateConfig, TemplateConfig } from '@/lib/template-config';

// GET - Load template configuration
export async function GET() {
  try {
    const config = await loadTemplateConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to load template config:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

// POST - Save template configuration
export async function POST(request: NextRequest) {
  try {
    const config: TemplateConfig = await request.json();
    
    // Validate basic structure
    if (!config.elements || !Array.isArray(config.elements)) {
      return NextResponse.json(
        { error: 'Invalid configuration format' },
        { status: 400 }
      );
    }

    await saveTemplateConfig(config);
    
    return NextResponse.json({ success: true, lastUpdated: Date.now() });
  } catch (error) {
    console.error('Failed to save template config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
