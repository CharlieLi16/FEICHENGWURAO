'use client';

import { useState, useEffect } from 'react';
import { SlideSlot } from '@/lib/event-state';
import Link from 'next/link';
import SkeletonUpload from '@/components/SkeletonUpload';

export default function SlidesPage() {
  const [slides, setSlides] = useState<SlideSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load existing slides
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/event/state');
      const data = await res.json();
      if (data.slides?.length > 0) {
        setSlides(data.slides);
      }
    } catch (e) {
      console.error('Error loading slides:', e);
    } finally {
      setLoading(false);
    }
  };

  // Update a single slide's image
  const updateSlideImage = (slideId: string, imageUrl: string | null) => {
    setSlides((prev) =>
      prev.map((slide) =>
        slide.id === slideId ? { ...slide, imageUrl: imageUrl || undefined } : slide
      )
    );
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
  const presetSlides = slides.filter((s) => !s.id.startsWith('custom'));
  const customSlides = slides.filter((s) => s.id.startsWith('custom'));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📽️ 幻灯片管理</h1>
          <p className="text-gray-400 text-sm">上传设计好的图片，在活动中快速切换展示</p>
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

      {/* Instructions */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <h3 className="font-bold mb-2 text-yellow-400">💡 使用说明</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• 上传设计好的幻灯片图片（推荐尺寸：1920×1080）</li>
          <li>• 在控制台可以快速切换显示这些幻灯片</li>
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
              onImageChange={(url) => updateSlideImage(slide.id, url)}
              onPreview={() => previewSlide(slide.id)}
            />
          ))}
        </div>
      </section>

      {/* Custom Slides */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-purple-400">✨ 自定义幻灯片</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {customSlides.map((slide) => (
            <SlideCard
              key={slide.id}
              slide={slide}
              onImageChange={(url) => updateSlideImage(slide.id, url)}
              onPreview={() => previewSlide(slide.id)}
            />
          ))}
        </div>
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
  onImageChange: (url: string | null) => void;
  onPreview: () => void;
}

function SlideCard({ slide, onImageChange, onPreview }: SlideCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-white">{slide.name}</h3>
          <p className="text-xs text-gray-400">{slide.description}</p>
        </div>
      </div>

      {/* Image Upload */}
      <SkeletonUpload
        value={slide.imageUrl}
        onChange={onImageChange}
        placeholder="上传幻灯片"
        accept="image/*"
        aspectRatio="16:9"
        className="mb-3"
      />

      {/* Preview Button */}
      {slide.imageUrl && (
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
