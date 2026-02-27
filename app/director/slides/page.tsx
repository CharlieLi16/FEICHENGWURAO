'use client';

import { useState, useEffect } from 'react';
import { SlideSlot, isPresetSlide, presetSlideSlots } from '@/lib/event-state';
import Link from 'next/link';
import SkeletonUpload from '@/components/SkeletonUpload';

// Generate a simple unique ID
function generateId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface SlidesConfig {
  configured: boolean;
  presentationId?: string;
  presentationUrl?: string;
  slideCount?: number;
}

export default function SlidesPage() {
  const [slides, setSlides] = useState<SlideSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Custom slides Google Slides config (separate from female guest intro)
  const [customSlidesConfig, setCustomSlidesConfig] = useState<SlidesConfig | null>(null);
  const [slidesUrlInput, setSlidesUrlInput] = useState('');
  const [slideCountInput, setSlideCountInput] = useState('50');
  const [configuringSlides, setConfiguringSlides] = useState(false);

  // Load existing slides and Google Slides config
  useEffect(() => {
    loadData();
    loadCustomSlidesConfig();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/event/state');
      const data = await res.json();
      if (data.slides?.length > 0) {
        setSlides(data.slides);
      } else {
        // Initialize with preset slots if no data
        setSlides([...presetSlideSlots]);
      }
    } catch (e) {
      console.error('Error loading slides:', e);
      setSlides([...presetSlideSlots]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadCustomSlidesConfig = async () => {
    try {
      const res = await fetch('/api/custom-slides-config');
      const data = await res.json();
      setCustomSlidesConfig(data);
      if (data.presentationUrl) {
        setSlidesUrlInput(data.presentationUrl);
      }
      if (data.slideCount) {
        setSlideCountInput(String(data.slideCount));
      }
    } catch (e) {
      console.error('Error loading custom slides config:', e);
    }
  };

  const saveCustomSlidesConfig = async () => {
    if (!slidesUrlInput.trim()) {
      setMessage('❌ 请输入 Google Slides 链接');
      return;
    }
    
    setConfiguringSlides(true);
    try {
      const res = await fetch('/api/custom-slides-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: slidesUrlInput.trim(),
          slideCount: parseInt(slideCountInput) || 50
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage('✅ Google Slides 配置成功！');
        loadCustomSlidesConfig();
      } else {
        setMessage(`❌ ${data.error || '配置失败'}`);
      }
    } catch (e) {
      setMessage('❌ 配置失败');
      console.error(e);
    } finally {
      setConfiguringSlides(false);
    }
  };

  // Update a single slide
  const updateSlide = (slideId: string, updates: Partial<SlideSlot>) => {
    setSlides((prev) =>
      prev.map((slide) =>
        slide.id === slideId ? { ...slide, ...updates } : slide
      )
    );
  };

  // Add a new custom slide
  const addCustomSlide = () => {
    const newSlide: SlideSlot = {
      id: generateId(),
      name: `自定义幻灯片`,
      description: '可随时调用',
    };
    setSlides((prev) => [...prev, newSlide]);
  };

  // Remove a custom slide
  const removeSlide = (slideId: string) => {
    if (isPresetSlide(slideId)) return; // Can't remove preset slides
    setSlides((prev) => prev.filter((s) => s.id !== slideId));
  };

  // Save all slides
  const saveData = async () => {
    setSaving(true);
    setMessage('');
    try {
      await fetch('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setSlides', slides }),
      });
      setMessage('✅ 保存成功！');
    } catch (e) {
      setMessage('❌ 保存失败');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Preview slide on stage
  const previewSlide = async (slideId: string) => {
    try {
      await fetch('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'showSlide', slideId }),
      });
    } catch (e) {
      console.error('Error showing slide:', e);
    }
  };

  // Hide slide
  const hideSlide = async () => {
    try {
      await fetch('/api/event/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hideSlide' }),
      });
    } catch (e) {
      console.error('Error hiding slide:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Group slides: preset vs custom
  const presetSlides = slides.filter((s) => isPresetSlide(s.id));
  const customSlides = slides.filter((s) => !isPresetSlide(s.id));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📽️ 幻灯片管理</h1>
          <p className="text-gray-400 text-sm">上传图片或使用 Google Slides 页面</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={hideSlide}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            🚫 关闭幻灯片
          </button>
          <Link href="/director" className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
            ← 返回控制台
          </Link>
          <button
            onClick={saveData}
            disabled={saving}
            className="px-6 py-2 bg-pink-600 rounded-lg hover:bg-pink-500 disabled:opacity-50"
          >
            {saving ? '保存中...' : '💾 保存'}
          </button>
        </div>
      </header>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-center ${
            message.includes('成功') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {message}
        </div>
      )}

      {/* Google Slides Configuration for Custom Slides */}
      <div className="mb-6 p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border border-green-500/30">
        <h3 className="font-bold mb-3 text-green-400">📊 幻灯片 Google Slides 配置</h3>
        <p className="text-xs text-gray-400 mb-3">
          此配置仅用于幻灯片功能，与女嘉宾介绍的 PPT 是独立的
        </p>
        
        {customSlidesConfig?.configured ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-400">✓ 已配置</span>
              <span className="text-gray-400">({customSlidesConfig.slideCount || '?'} 页)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={slidesUrlInput}
                onChange={(e) => setSlidesUrlInput(e.target.value)}
                placeholder="粘贴 Google Slides 链接..."
                className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-sm"
              />
              <input
                type="number"
                value={slideCountInput}
                onChange={(e) => setSlideCountInput(e.target.value)}
                placeholder="页数"
                className="w-20 px-3 py-2 bg-gray-800 rounded-lg text-sm text-center"
                min={1}
              />
              <button
                onClick={saveCustomSlidesConfig}
                disabled={configuringSlides}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm disabled:opacity-50"
              >
                {configuringSlides ? '...' : '更新'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={slidesUrlInput}
                onChange={(e) => setSlidesUrlInput(e.target.value)}
                placeholder="粘贴 Google Slides 链接..."
                className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-sm"
              />
              <input
                type="number"
                value={slideCountInput}
                onChange={(e) => setSlideCountInput(e.target.value)}
                placeholder="页数"
                className="w-20 px-3 py-2 bg-gray-800 rounded-lg text-sm text-center"
                min={1}
              />
              <button
                onClick={saveCustomSlidesConfig}
                disabled={configuringSlides || !slidesUrlInput.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm disabled:opacity-50"
              >
                {configuringSlides ? '配置中...' : '配置'}
              </button>
            </div>
            <p className="text-xs text-yellow-400">
              ⚠ 配置后才能使用「PPT页」功能
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <h3 className="font-bold mb-2 text-yellow-400">💡 使用说明</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>上传图片</strong>：推荐尺寸 1920×1080</li>
          <li>• <strong>Google Slides</strong>：输入页码使用上方配置的 PPT 页面</li>
          <li>• 幻灯片会全屏覆盖在主舞台上方</li>
          <li>• 点击"预览"可以在主舞台上查看效果</li>
        </ul>
      </div>

      {/* Preset Slides */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-pink-400">🎯 预设幻灯片</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {presetSlides.map((slide) => (
            <SlideCard
              key={slide.id}
              slide={slide}
              isPreset={true}
              googleSlidesAvailable={customSlidesConfig?.configured || false}
              googleSlideCount={customSlidesConfig?.slideCount || 0}
              onUpdate={(updates) => updateSlide(slide.id, updates)}
              onPreview={() => previewSlide(slide.id)}
              onRemove={() => {}}
            />
          ))}
        </div>
      </section>

      {/* Custom Slides */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-purple-400">✨ 自定义幻灯片</h2>
          <button
            onClick={addCustomSlide}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium"
          >
            ➕ 添加幻灯片
          </button>
        </div>
        
        {customSlides.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
            <p className="mb-2">暂无自定义幻灯片</p>
            <button
              onClick={addCustomSlide}
              className="text-purple-400 hover:text-purple-300"
            >
              点击添加 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {customSlides.map((slide) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                isPreset={false}
                googleSlidesAvailable={customSlidesConfig?.configured || false}
                googleSlideCount={customSlidesConfig?.slideCount || 0}
                onUpdate={(updates) => updateSlide(slide.id, updates)}
                onPreview={() => previewSlide(slide.id)}
                onRemove={() => removeSlide(slide.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Save Button (floating) */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={saveData}
          disabled={saving}
          className="px-8 py-4 bg-pink-600 rounded-full shadow-lg hover:bg-pink-500 disabled:opacity-50 text-lg font-bold"
        >
          {saving ? '保存中...' : '💾 保存设置'}
        </button>
      </div>
    </div>
  );
}

// Slide Card Component
interface SlideCardProps {
  slide: SlideSlot;
  isPreset: boolean;
  googleSlidesAvailable: boolean;
  googleSlideCount: number;
  onUpdate: (updates: Partial<SlideSlot>) => void;
  onPreview: () => void;
  onRemove: () => void;
}

function SlideCard({ 
  slide, 
  isPreset, 
  googleSlidesAvailable, 
  googleSlideCount,
  onUpdate, 
  onPreview, 
  onRemove 
}: SlideCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(slide.name);
  
  // Determine source mode: 'image' | 'google' | 'none'
  const sourceMode = slide.googleSlideIndex ? 'google' : slide.imageUrl ? 'image' : 'none';
  
  const hasContent = slide.imageUrl || slide.googleSlideIndex;

  const handleNameSave = () => {
    onUpdate({ name: nameInput.trim() || '自定义幻灯片' });
    setEditingName(false);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 relative">
      {/* Remove button for custom slides */}
      {!isPreset && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-400 rounded-full text-xs flex items-center justify-center shadow-lg"
          title="删除"
        >
          ✕
        </button>
      )}
      
      {/* Header */}
      <div className="mb-3">
        {isPreset ? (
          <div>
            <h3 className="font-bold text-white">{slide.name}</h3>
            <p className="text-xs text-gray-400">{slide.description}</p>
          </div>
        ) : editingName ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
              className="flex-1 px-2 py-1 bg-gray-700 rounded text-sm"
              autoFocus
            />
            <button
              onClick={handleNameSave}
              className="px-2 py-1 bg-green-600 rounded text-xs"
            >
              ✓
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h3 
              className="font-bold text-white cursor-pointer hover:text-purple-300"
              onClick={() => setEditingName(true)}
              title="点击编辑名称"
            >
              {slide.name} ✏️
            </h3>
          </div>
        )}
      </div>

      {/* Source Selection Tabs */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => onUpdate({ googleSlideIndex: undefined })}
          className={`flex-1 py-1.5 text-xs rounded-l-lg transition-colors ${
            sourceMode !== 'google' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          📷 图片
        </button>
        <button
          onClick={() => {
            if (googleSlidesAvailable) {
              onUpdate({ imageUrl: undefined, googleSlideIndex: 1 });
            }
          }}
          disabled={!googleSlidesAvailable}
          className={`flex-1 py-1.5 text-xs rounded-r-lg transition-colors ${
            sourceMode === 'google' 
              ? 'bg-green-600 text-white' 
              : googleSlidesAvailable
                ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          📊 PPT页
        </button>
      </div>

      {/* Content Area */}
      {sourceMode === 'google' ? (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400">页码:</span>
            <input
              type="number"
              min={1}
              max={googleSlideCount || 100}
              value={slide.googleSlideIndex || 1}
              onChange={(e) => onUpdate({ googleSlideIndex: parseInt(e.target.value) || 1 })}
              className="w-20 px-2 py-1 bg-gray-700 rounded text-sm text-center"
            />
            <span className="text-xs text-gray-500">/ {googleSlideCount || '?'}</span>
          </div>
          <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center text-4xl">
            📊
          </div>
          <div className="text-center text-xs text-green-400 mt-1">
            使用 Google Slides 第 {slide.googleSlideIndex} 页
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <SkeletonUpload
            value={slide.imageUrl}
            onChange={(url) => onUpdate({ imageUrl: url || undefined })}
            placeholder="上传幻灯片"
            accept="image/*"
            aspectRatio="16:9"
          />
        </div>
      )}

      {/* Preview Button */}
      {hasContent && (
        <button
          onClick={onPreview}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
        >
          👁️ 预览
        </button>
      )}
    </div>
  );
}
