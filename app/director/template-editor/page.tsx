'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ElementConfig, TemplateConfig, defaultTemplateConfig } from '@/lib/template-config';

// Sample guest data for preview
const sampleGuest = {
  id: 1,
  name: '张小美',
  nickname: 'Carol',
  photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  photos: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
  ],
  introduction: '我叫小美，平时喜欢宅在家，也爱吃甜品爱发呆。性格上，我是一个对人有耐心且真诚的人——喜怒哀乐都写在脸上。希望在忙碌的生活里，也能找到一个能一起分享小确幸的人。',
  tags: ['NYU', '计算机', '喜欢旅行'],
};

// Draggable/Resizable Element Component
function EditableElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  canvasSize,
  showPreview,
}: {
  element: ElementConfig;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ElementConfig>) => void;
  canvasSize: { width: number; height: number };
  showPreview: boolean;
}) {
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
    outline: isSelected ? '3px solid #3b82f6' : '1px dashed rgba(0,0,0,0.2)',
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
        width: Math.max(3, Math.min(100 - element.x, resizeStart.width + deltaX)),
        height: Math.max(3, Math.min(100 - element.y, resizeStart.height + deltaY)),
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

  // Render content based on element type and preview mode
  const renderContent = () => {
    if (element.type === 'image' && element.imageUrl) {
      return (
        <img
          src={element.imageUrl}
          alt={element.label || element.id}
          className="w-full h-full object-contain pointer-events-none"
          onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
        />
      );
    }

    if (element.type === 'container' && showPreview) {
      // Show sample data in preview mode
      switch (element.id) {
        case 'main-photo':
          return (
            <img src={sampleGuest.photo} alt="" className="w-full h-full object-cover rounded-lg" />
          );
        case 'name-text':
          return (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl md:text-4xl font-bold text-rose-700 font-serif">{sampleGuest.nickname}</span>
            </div>
          );
        case 'intro-text':
          return (
            <div className="w-full h-full overflow-hidden p-2">
              <p className="text-xs md:text-sm text-rose-800 leading-relaxed">{sampleGuest.introduction}</p>
            </div>
          );
        case 'side-photo-1':
          return sampleGuest.photos[1] ? (
            <img src={sampleGuest.photos[1]} alt="" className="w-full h-full object-cover rounded-full" />
          ) : null;
        case 'tags-row':
          return (
            <div className="w-full h-full flex items-center justify-center gap-2">
              {sampleGuest.tags.map((tag, i) => (
                <span key={i} className="px-2 py-1 bg-pink-100 text-rose-700 text-xs rounded">{tag}</span>
              ))}
            </div>
          );
        case 'guest-badge':
          return (
            <div className="w-full h-full flex items-center justify-center">
              <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold rounded-lg">
                {sampleGuest.id}号女嘉宾
              </span>
            </div>
          );
        default:
          return (
            <div className="w-full h-full bg-white/30 border border-dashed border-rose-300 flex items-center justify-center text-xs text-rose-400">
              {element.label}
            </div>
          );
      }
    }

    // Default container display
    return (
      <div className="w-full h-full bg-white/20 border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-500">
        {element.label || element.id}
      </div>
    );
  };

  return (
    <div style={style} onMouseDown={handleMouseDown} className="group">
      {renderContent()}

      {/* Element label on hover */}
      {!showPreview && (
        <div className="absolute -top-6 left-0 text-xs text-white bg-gray-800 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
          {element.label || element.id}
        </div>
      )}

      {/* Resize handle */}
      {isSelected && (
        <>
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-tl"
            onMouseDown={handleResizeStart}
          />
          <div className="absolute -bottom-6 left-0 text-xs text-blue-400 whitespace-nowrap">
            {Math.round(element.width)}% × {Math.round(element.height)}%
          </div>
        </>
      )}
    </div>
  );
}

// Properties Panel Component
function PropertiesPanel({
  element,
  onUpdate,
}: {
  element: ElementConfig | null;
  onUpdate: (updates: Partial<ElementConfig>) => void;
}) {
  if (!element) {
    return (
      <div className="text-gray-400 text-center py-8 text-sm">
        点击画布中的元素<br />进行编辑
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="pb-2 border-b border-gray-700">
        <div className="font-bold text-white">{element.label || element.id}</div>
        <div className="text-xs text-gray-500">{element.type}</div>
      </div>

      {/* Position */}
      <div>
        <div className="text-xs text-gray-400 mb-1">位置 (%)</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 w-4">X</span>
            <input
              type="number"
              value={Math.round(element.x * 10) / 10}
              onChange={(e) => onUpdate({ x: parseFloat(e.target.value) || 0 })}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
              step="1"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 w-4">Y</span>
            <input
              type="number"
              value={Math.round(element.y * 10) / 10}
              onChange={(e) => onUpdate({ y: parseFloat(e.target.value) || 0 })}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
              step="1"
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div>
        <div className="text-xs text-gray-400 mb-1">尺寸 (%)</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 w-4">W</span>
            <input
              type="number"
              value={Math.round(element.width * 10) / 10}
              onChange={(e) => onUpdate({ width: parseFloat(e.target.value) || 5 })}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
              step="1"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 w-4">H</span>
            <input
              type="number"
              value={Math.round(element.height * 10) / 10}
              onChange={(e) => onUpdate({ height: parseFloat(e.target.value) || 5 })}
              className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
              step="1"
            />
          </div>
        </div>
      </div>

      {/* Rotation & Z-Index */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-gray-400 mb-1">旋转 (°)</div>
          <input
            type="number"
            value={element.rotation}
            onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
            step="1"
          />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">层级</div>
          <input
            type="number"
            value={element.zIndex}
            onChange={(e) => onUpdate({ zIndex: parseInt(e.target.value) || 0 })}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm"
          />
        </div>
      </div>

      {/* Visibility */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={element.visible}
          onChange={(e) => onUpdate({ visible: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm text-white">显示元素</span>
      </label>

      {/* Image URL */}
      {element.type === 'image' && (
        <div>
          <div className="text-xs text-gray-400 mb-1">图片路径</div>
          <input
            type="text"
            value={element.imageUrl || ''}
            onChange={(e) => onUpdate({ imageUrl: e.target.value })}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
            placeholder="/assets/images/template/..."
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="pt-2 border-t border-gray-700 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onUpdate({ zIndex: element.zIndex + 1 })}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
          >
            ↑ 上移
          </button>
          <button
            onClick={() => onUpdate({ zIndex: Math.max(0, element.zIndex - 1) })}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
          >
            ↓ 下移
          </button>
        </div>
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
  const [showPreview, setShowPreview] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Undo/Redo history
  const [history, setHistory] = useState<TemplateConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z or Ctrl+Y = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // Ctrl+S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveConfig();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);

  // Track history for undo/redo
  useEffect(() => {
    if (isUndoRedo) {
      setIsUndoRedo(false);
      return;
    }
    // Add to history
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(config)));
      // Keep last 50 states
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [config.elements]);

  const undo = () => {
    if (historyIndex > 0) {
      setIsUndoRedo(true);
      setHistoryIndex(historyIndex - 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      setMessage('撤销');
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedo(true);
      setHistoryIndex(historyIndex + 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      setMessage('重做');
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/template-config');
      const data = await res.json();
      if (data.elements) {
        setConfig(data);
        setHistory([JSON.parse(JSON.stringify(data))]);
        setHistoryIndex(0);
        setMessage('✓ 已加载');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage('加载失败');
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
        setMessage('✓ 已保存');
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
      setMessage('已重置');
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
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/director" className="text-gray-400 hover:text-white text-sm">
              ← 返回
            </Link>
            <h1 className="text-lg font-bold">🎨 模板编辑器</h1>
            <span className="text-xs text-gray-500">{message}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded text-sm"
              title="撤销 (Ctrl+Z)"
            >
              ↩️
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded text-sm"
              title="重做 (Ctrl+Y)"
            >
              ↪️
            </button>
            <div className="w-px h-6 bg-gray-600 mx-1" />
            {/* Preview toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-1.5 rounded text-sm ${showPreview ? 'bg-pink-600' : 'bg-gray-700'}`}
            >
              {showPreview ? '👁️ 预览' : '📐 编辑'}
            </button>
            <div className="w-px h-6 bg-gray-600 mx-1" />
            <button
              onClick={resetConfig}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              重置
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-sm font-medium"
            >
              {saving ? '...' : '💾 保存'}
            </button>
            <Link
              href="/stage"
              target="_blank"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm"
            >
              舞台 ↗
            </Link>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-52px)]">
        {/* Left Sidebar - Element List */}
        <div className="w-44 bg-gray-800 border-r border-gray-700 p-2 overflow-y-auto">
          <div className="text-xs text-gray-500 mb-2 px-1">元素列表</div>
          <div className="space-y-0.5">
            {config.elements.map((el) => (
              <button
                key={el.id}
                onClick={() => setSelectedId(el.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs truncate flex items-center gap-1 ${
                  selectedId === el.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                } ${!el.visible ? 'opacity-40' : ''}`}
              >
                <span>{el.type === 'image' ? '🖼️' : '📦'}</span>
                <span className="truncate">{el.label || el.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 p-3 overflow-hidden flex items-center justify-center bg-gray-950">
          <div
            ref={canvasRef}
            className="relative bg-gradient-to-br from-pink-200 via-rose-100 to-pink-50 rounded-lg overflow-hidden shadow-2xl"
            style={{ 
              width: '100%',
              maxWidth: '1200px',
              aspectRatio: '16/9',
            }}
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
                  showPreview={showPreview}
                />
              ))}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-56 bg-gray-800 border-l border-gray-700 p-3 overflow-y-auto">
          <div className="text-xs text-gray-500 mb-2">属性</div>
          <PropertiesPanel
            element={selectedElement}
            onUpdate={(updates) => selectedId && updateElement(selectedId, updates)}
          />
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-3 left-3 text-xs text-gray-600 space-x-3">
        <span>Ctrl+Z 撤销</span>
        <span>Ctrl+Y 重做</span>
        <span>Ctrl+S 保存</span>
      </div>
    </div>
  );
}
