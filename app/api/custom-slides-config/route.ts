import { NextRequest, NextResponse } from 'next/server';
import { extractPresentationId } from '@/lib/google-slides';
import { put, list, del } from '@vercel/blob';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const BLOB_PATH = 'custom-slides/config.json';
const LOCAL_CONFIG_DIR = join(process.cwd(), '.local-data');
const LOCAL_CONFIG_FILE = join(LOCAL_CONFIG_DIR, 'custom-slides-config.json');

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

// GET - Get custom slides Google Slides configuration
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

    // Production: use Vercel Blob - use list() for reliable retrieval
    const { blobs } = await list({ prefix: BLOB_PATH });
    if (blobs.length === 0) {
      return NextResponse.json({ configured: false });
    }

    // Get the latest blob (in case of duplicates)
    const latest = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    const response = await fetch(`${latest.url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ configured: false });
    }

    const config: SlidesConfig = await response.json();
    return NextResponse.json({
      configured: true,
      ...config,
    });
  } catch (error) {
    console.error('Failed to load custom slides config:', error);
    return NextResponse.json({ configured: false });
  }
}

// POST - Set Google Slides URL for custom slides
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
    
    // Build config
    const config: SlidesConfig = {
      presentationUrl: url,
      presentationId,
      slideCount: slideCount || 50, // Default to 50 slides for custom
      lastUpdated: Date.now(),
    };
    
    // Save config
    if (isLocalDev) {
      writeLocalConfig(config);
    } else {
      // Clean up any old blobs first
      try {
        const { blobs } = await list({ prefix: BLOB_PATH });
        for (const blob of blobs) {
          await del(blob.url);
        }
      } catch {}
      
      await put(BLOB_PATH, JSON.stringify(config, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    }
    
    return NextResponse.json({
      success: true,
      presentationId,
      message: isLocalDev ? '已保存到本地' : '已保存到云端',
      slideCount: config.slideCount,
    });
    
  } catch (error) {
    console.error('Failed to configure custom slides:', error);
    return NextResponse.json({ 
      error: `配置失败: ${error instanceof Error ? error.message : '未知错误'}` 
    }, { status: 500 });
  }
}

// DELETE - Remove configuration
export async function DELETE() {
  try {
    if (isLocalDev) {
      deleteLocalConfig();
    } else {
      const { blobs } = await list({ prefix: BLOB_PATH });
      for (const blob of blobs) {
        await del(blob.url);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete config:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
