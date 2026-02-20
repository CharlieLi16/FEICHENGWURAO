import { NextRequest, NextResponse } from 'next/server';
import { extractPresentationId } from '@/lib/google-slides';
import { put, head, del } from '@vercel/blob';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const BLOB_PATH = 'google-slides/config.json';
const LOCAL_CONFIG_DIR = join(process.cwd(), '.local-data');
const LOCAL_CONFIG_FILE = join(LOCAL_CONFIG_DIR, 'google-slides-config.json');

// Check if we're in local development (no Vercel Blob token)
const isLocalDev = !process.env.BLOB_READ_WRITE_TOKEN;

interface SlidesConfig {
  presentationUrl: string;
  presentationId: string;
  slideCount: number;
  lastUpdated: number;
}

// Local file helpers for development
function readLocalConfig(): SlidesConfig | null {
  try {
    if (existsSync(LOCAL_CONFIG_FILE)) {
      return JSON.parse(readFileSync(LOCAL_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read local config:', e);
  }
  return null;
}

function writeLocalConfig(config: SlidesConfig): void {
  if (!existsSync(LOCAL_CONFIG_DIR)) {
    mkdirSync(LOCAL_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(LOCAL_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function deleteLocalConfig(): void {
  try {
    if (existsSync(LOCAL_CONFIG_FILE)) {
      unlinkSync(LOCAL_CONFIG_FILE);
    }
  } catch (e) {
    console.error('Failed to delete local config:', e);
  }
}

// GET - Get current Google Slides configuration
export async function GET() {
  try {
    // Local development: use file system
    if (isLocalDev) {
      const config = readLocalConfig();
      if (config) {
        return NextResponse.json({ configured: true, ...config });
      }
      return NextResponse.json({ configured: false });
    }

    // Production: use Vercel Blob
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

// POST - Set Google Slides URL
export async function POST(request: NextRequest) {
  try {
    const { url, slideCount } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    const presentationId = extractPresentationId(url);
    if (!presentationId) {
      return NextResponse.json({ error: 'Invalid Google Slides URL' }, { status: 400 });
    }
    
    // Build config - we use iframe embed so no API needed
    const config: SlidesConfig = {
      presentationUrl: url,
      presentationId,
      slideCount: slideCount || 12, // Default to 12 slides
      lastUpdated: Date.now(),
    };
    
    // Save config
    if (isLocalDev) {
      writeLocalConfig(config);
    } else {
      try {
        const existing = await head(BLOB_PATH);
        if (existing) await del(existing.url);
      } catch {}
      
      await put(BLOB_PATH, JSON.stringify(config, null, 2), {
        access: 'public',
        contentType: 'application/json',
      });
    }
    
    return NextResponse.json({
      success: true,
      presentationId,
      message: isLocalDev ? '已保存到本地' : '已保存到云端',
      slideCount: config.slideCount,
    });
    
  } catch (error) {
    console.error('Failed to configure Google Slides:', error);
    return NextResponse.json({ 
      error: `配置失败: ${error instanceof Error ? error.message : '未知错误'}` 
    }, { status: 500 });
  }
}

// DELETE - Remove Google Slides configuration
export async function DELETE() {
  try {
    if (isLocalDev) {
      deleteLocalConfig();
    } else {
      const existing = await head(BLOB_PATH);
      if (existing) {
        await del(existing.url);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete config:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
