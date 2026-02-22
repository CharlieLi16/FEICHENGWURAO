// Template configuration types and storage for visual editor

import { put, head, del } from '@vercel/blob';

// Individual element configuration
export interface ElementConfig {
  id: string;
  type: 'image' | 'text' | 'container';
  x: number;          // Percentage position (0-100)
  y: number;
  width: number;      // Percentage size (0-100)
  height: number;
  rotation: number;   // Degrees
  zIndex: number;     // Layer order
  visible: boolean;
  // Optional properties
  imageUrl?: string;  // For image elements
  label?: string;     // Display name in editor
}

// Full template configuration
export interface TemplateConfig {
  version: number;
  elements: ElementConfig[];
  lastUpdated: number;
}

// Default element configurations
export const defaultElements: ElementConfig[] = [
  // Background decorations
  {
    id: 'bg-frame',
    type: 'image',
    label: '背景框架',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    visible: true,
    imageUrl: '/assets/images/template/bg-frame.png',
  },
  // Corner decoration
  {
    id: 'corner-deco',
    type: 'image',
    label: '角落装饰',
    x: 2,
    y: 2,
    width: 10,
    height: 15,
    rotation: 0,
    zIndex: 5,
    visible: true,
    imageUrl: '/assets/images/template/corner-deco.png',
  },
  // Photo frame (left side)
  {
    id: 'photo-frame',
    type: 'image',
    label: '照片相框',
    x: 5,
    y: 15,
    width: 35,
    height: 70,
    rotation: -2,
    zIndex: 10,
    visible: true,
    imageUrl: '/assets/images/template/photo-frame.png',
  },
  // Main photo (inside frame)
  {
    id: 'main-photo',
    type: 'container',
    label: '主照片位置',
    x: 8,
    y: 20,
    width: 28,
    height: 55,
    rotation: -2,
    zIndex: 9,
    visible: true,
  },
  // Name frame (top right)
  {
    id: 'name-frame',
    type: 'image',
    label: '名字边框',
    x: 45,
    y: 5,
    width: 30,
    height: 12,
    rotation: 0,
    zIndex: 10,
    visible: true,
    imageUrl: '/assets/images/template/name-frame.png',
  },
  // Name text position
  {
    id: 'name-text',
    type: 'container',
    label: '名字文字',
    x: 47,
    y: 6,
    width: 26,
    height: 10,
    rotation: 0,
    zIndex: 11,
    visible: true,
  },
  // Introduction card
  {
    id: 'intro-card',
    type: 'image',
    label: '介绍卡片',
    x: 42,
    y: 20,
    width: 55,
    height: 45,
    rotation: 0,
    zIndex: 10,
    visible: true,
    imageUrl: '/assets/images/template/intro-card.png',
  },
  // Introduction text position
  {
    id: 'intro-text',
    type: 'container',
    label: '介绍文字',
    x: 45,
    y: 25,
    width: 48,
    height: 35,
    rotation: 0,
    zIndex: 11,
    visible: true,
  },
  // Side photos (circular)
  {
    id: 'side-photo-1',
    type: 'container',
    label: '副照片1',
    x: 80,
    y: 5,
    width: 8,
    height: 12,
    rotation: 0,
    zIndex: 10,
    visible: true,
  },
  {
    id: 'side-photo-2',
    type: 'container',
    label: '副照片2',
    x: 90,
    y: 5,
    width: 8,
    height: 12,
    rotation: 0,
    zIndex: 10,
    visible: true,
  },
  // Tags row
  {
    id: 'tags-row',
    type: 'container',
    label: '标签区域',
    x: 42,
    y: 70,
    width: 55,
    height: 10,
    rotation: 0,
    zIndex: 10,
    visible: true,
  },
  // Guest number badge
  {
    id: 'guest-badge',
    type: 'container',
    label: '嘉宾编号',
    x: 10,
    y: 85,
    width: 25,
    height: 8,
    rotation: -1,
    zIndex: 15,
    visible: true,
  },
];

// Default configuration
export const defaultTemplateConfig: TemplateConfig = {
  version: 1,
  elements: defaultElements,
  lastUpdated: Date.now(),
};

const BLOB_PATH = 'template-config/config.json';

// Save template configuration to Vercel Blob
export async function saveTemplateConfig(config: TemplateConfig): Promise<void> {
  try {
    const json = JSON.stringify({ ...config, lastUpdated: Date.now() }, null, 2);
    
    // Delete old file first
    try {
      const existing = await head(BLOB_PATH);
      if (existing) {
        await del(existing.url);
      }
    } catch {
      // File doesn't exist, that's fine
    }

    await put(BLOB_PATH, json, {
      access: 'public',
      contentType: 'application/json',
    });

    console.log('[TemplateConfig] Saved to Blob');
  } catch (error) {
    console.error('[TemplateConfig] Failed to save:', error);
    throw error;
  }
}

// Load template configuration from Vercel Blob
export async function loadTemplateConfig(): Promise<TemplateConfig> {
  try {
    const blobInfo = await head(BLOB_PATH);
    if (!blobInfo) {
      console.log('[TemplateConfig] No saved config, using defaults');
      return defaultTemplateConfig;
    }

    const response = await fetch(blobInfo.url);
    if (!response.ok) {
      console.error('[TemplateConfig] Failed to fetch config');
      return defaultTemplateConfig;
    }

    const config: TemplateConfig = await response.json();
    console.log('[TemplateConfig] Loaded from Blob');
    return config;
  } catch (error) {
    // "blob does not exist" is expected when no config has been saved yet
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('does not exist')) {
      console.log('[TemplateConfig] No saved config found, using defaults');
    } else {
      console.error('[TemplateConfig] Failed to load:', error);
    }
    return defaultTemplateConfig;
  }
}

// Get available template images from the template folder
export function getAvailableTemplateImages(): string[] {
  // These are the expected template images
  return [
    '/assets/images/template/bg-frame.png',
    '/assets/images/template/photo-frame.png',
    '/assets/images/template/name-frame.png',
    '/assets/images/template/intro-card.png',
    '/assets/images/template/corner-deco.png',
    '/assets/images/template/circle-frame.png',
    '/assets/images/template/tag-button.png',
  ];
}
