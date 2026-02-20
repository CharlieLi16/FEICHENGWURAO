'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ElementConfig, TemplateConfig, defaultTemplateConfig } from '@/lib/template-config';

// Draggable/Resizable Element Component
function EditableElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  canvasSize,
}: {
  element: ElementConfig;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ElementConfig>) => void;
  canvasSize: { width: number; height: number };
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elemX: 0, elemY: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  if (!element.visible) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: element.zIndex + (isSelected ? 1000 : 0),
    cursor: isDragging ? 'grabbing' : 'grab',
    outline: isSelected ? '2px solid #3b82f6' : '1px dashed rgba(255,255,255,0.3)',
    boxSizing: 'border-box',
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elemX: element.x,
      elemY: element.y,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && canvasSize.width > 0) {
      const deltaX = ((e.clientX - dragStart.x) / canvasSize.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / canvasSize.height) * 100;
      onUpdate({
        x: Math.max(0, Math.min(100 - element.width, dragStart.elemX + deltaX)),
        y: Math.max(0, Math.min(100 - element.height, dragStart.elemY + deltaY)),
      });
    }
    if (isResizing && canvasSize.width > 0) {
      const deltaX = ((e.clientX - resizeStart.x) / canvasSize.width) * 100;
      const deltaY = ((e.clientY - resizeStart.y) / canvasSize.height) * 100;
      onUpdate({
        width: Math.max(5, Math.min(100 - element.x, resizeStart.width + deltaX)),
        height: Math.max(5, Math.min(100 - element.y, resizeStart.height + deltaY)),
      });
    }
  }, [isDragging, isResizing, dragStart, resizeStart, canvasSize, element, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height,
    });
  };

  return (
    <div
      ref={elementRef}
      style={style}
      onMouseDown={handleMouseDown}
      className="group"
    >
      {/* Element content */}
      {element.type === 'image' && element.imageUrl && (
        <img
          src={element.imageUrl}
          alt={element.label || element.id}
          className="w-full h-full object-contain pointer-events-none"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      {element.type === 'container' && (
        <div className="w-full h-full bg-white/20 border border-dashed border-white/50 flex items-center justify-center text-xs text-white/70">
          {element.label || element.id}
        </div>
      )}

      {/* Element label */}
      <div className="absolute -top-5 left-0 text-xs text-white bg-black/50 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {element.label || element.id}
      </div>

      {/* Resize handle */}
      {isSelected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}

// Properties Panel Component
function PropertiesPanel({
  element,
  onUpdate,
  onDelete,
}: {
  element: ElementConfig | null;
  onUpdate: (updates: Partial<ElementConfig>) => void;
  onDelete: () => void;
}) {
  if (!element) {
    return (
      <div className="text-gray-400 text-center py-8">
        点击画布中的元素进行编辑
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-bold text-white mb-2">{element.label || element.id}</div>
        <div className="text-xs text-gray-400">{element.type} · ID: {element.id}</div>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">X (%)</label>
          <input
            type="number"
            value={Math.round(element.x * 10) / 10}
            onChange={(e) => onUpdate({ x: parseFloat(e.target.value) || 0 })}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            step="0.5"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Y (%)</label>
          <input
            type="number"
            value={Math.round(element.y * 10) / 10}
            onChange={(e) => onUpdate({ y: parseFloat(e.target.value) || 0 })}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            step="0.5"
          />
        </div>
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">宽度 (%)</label>
          <input
            type="number"
            value={Math.round(element.width * 10) / 10}
            onChange={(e) => onUpdate({ width: parseFloat(e.target.value) || 5 })}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            step="0.5"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">高度 (%)</label>
          <input
            type="number"
            value={Math.round(element.height * 10) / 10}
            onChange={(e) => onUpdate({ height: parseFloat(e.target.value) || 5 })}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            step="0.5"
          />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label className="text-xs text-gray-400">旋转 (度)</label>
        <input
          type="number"
          value={element.rotation}
          onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
          className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
          step="1"
        />
      </div>

      {/* Z-Index */}
      <div>
        <label className="text-xs text-gray-400">层级</label>
        <input
          type="number"
          value={element.zIndex}
          onChange={(e) => onUpdate({ zIndex: parseInt(e.target.value) || 0 })}
          className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
        />
      </div>

      {/* Visibility */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={element.visible}
          onChange={(e) => onUpdate({ visible: e.target.checked })}
          className="w-4 h-4"
        />
        <label className="text-sm text-white">显示</label>
      </div>

      {/* Image URL (for image elements) */}
      {element.type === 'image' && (
        <div>
          <label className="text-xs text-gray-400">图片路径</label>
          <input
            type="text"
            value={element.imageUrl || ''}
            onChange={(e) => onUpdate({ imageUrl: e.target.value })}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            placeholder="/assets/images/template/xxx.png"
          />
        </div>
      )}

      {/* Layer buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onUpdate({ zIndex: element.zIndex + 1 })}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
        >
          上移层级
        </button>
        <button
          onClick={() => onUpdate({ zIndex: Math.max(0, element.zIndex - 1) })}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
        >
          下移层级
        </button>
      </div>
    </div>
  );
}

// Main Editor Page
export default function TemplateEditorPage() {
  const [config, setConfig] = useState<TemplateConfig>(defaultTemplateConfig);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Update canvas size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/template-config');
      const data = await res.json();
      if (data.elements) {
        setConfig(data);
        setMessage('配置已加载');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage('加载失败，使用默认配置');
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/template-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage('保存成功！');
      } else {
        setMessage('保存失败');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = () => {
    if (confirm('确定要重置为默认配置吗？')) {
      setConfig(defaultTemplateConfig);
      setSelectedId(null);
      setMessage('已重置为默认配置');
    }
  };

  const updateElement = (id: string, updates: Partial<ElementConfig>) => {
    setConfig((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  };

  const selectedElement = config.elements.find((el) => el.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/director" className="text-gray-400 hover:text-white">
              ← 返回控制台
            </Link>
            <h1 className="text-xl font-bold">🎨 模板编辑器</h1>
          </div>
          <div className="flex items-center gap-3">
            {message && (
              <span className="text-sm text-gray-400">{message}</span>
            )}
            <button
              onClick={resetConfig}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
            >
              重置
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded-lg text-sm font-medium"
            >
              {saving ? '保存中...' : '💾 保存'}
            </button>
            <Link
              href="/stage"
              target="_blank"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm"
            >
              预览舞台 ↗
            </Link>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Left Sidebar - Element List */}
        <div className="w-48 bg-gray-800 border-r border-gray-700 p-3 overflow-y-auto">
          <h2 className="text-sm font-bold text-gray-400 mb-3">元素列表</h2>
          <div className="space-y-1">
            {config.elements.map((el) => (
              <button
                key={el.id}
                onClick={() => setSelectedId(el.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm truncate ${
                  selectedId === el.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                } ${!el.visible ? 'opacity-50' : ''}`}
              >
                {el.type === 'image' ? '🖼️' : '📦'} {el.label || el.id}
              </button>
            ))}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 p-4 overflow-hidden">
          <div
            ref={canvasRef}
            className="relative w-full h-full bg-gradient-to-br from-pink-200 via-rose-100 to-pink-50 rounded-lg overflow-hidden"
            style={{ aspectRatio: '16/9', maxHeight: '100%' }}
            onClick={() => setSelectedId(null)}
          >
            {/* Render all elements */}
            {config.elements
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((element) => (
                <EditableElement
                  key={element.id}
                  element={element}
                  isSelected={selectedId === element.id}
                  onSelect={() => setSelectedId(element.id)}
                  onUpdate={(updates) => updateElement(element.id, updates)}
                  canvasSize={canvasSize}
                />
              ))}

            {/* Sample content overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-pink-400/30 text-2xl">
              拖拽元素调整位置
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-64 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-sm font-bold text-gray-400 mb-3">属性面板</h2>
          <PropertiesPanel
            element={selectedElement}
            onUpdate={(updates) => selectedId && updateElement(selectedId, updates)}
            onDelete={() => {}}
          />
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-500">
        提示：拖拽移动 · 右下角拖拽缩放 · 属性面板精确调整
      </div>
    </div>
  );
}
