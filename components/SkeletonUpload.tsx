'use client';

import { useState, useRef, useCallback } from 'react';

interface SkeletonUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  placeholder?: string;
  accept?: string;
  className?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | 'auto';
}

export default function SkeletonUpload({
  value,
  onChange,
  placeholder = '上传素材',
  accept = 'image/*,video/*',
  className = '',
  aspectRatio = 'auto',
}: SkeletonUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Aspect ratio classes
  const aspectClasses = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    'auto': 'min-h-[120px]',
  };

  // Handle file upload
  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (since fetch doesn't support progress natively)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const data = await response.json();
      setProgress(100);
      
      // Short delay to show 100%
      setTimeout(() => {
        onChange(data.url);
        setUploading(false);
        setProgress(0);
      }, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      setUploading(false);
      setProgress(0);
    }
  }, [onChange]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // Handle delete
  const handleDelete = () => {
    onChange(null);
  };

  // Handle replace
  const handleReplace = () => {
    inputRef.current?.click();
  };

  // Check if value is video
  const isVideo = value && (value.includes('.mp4') || value.includes('.webm') || value.includes('.mov'));

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Empty State - Skeleton Placeholder */}
      {!value && !uploading && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            ${aspectClasses[aspectRatio]}
            flex flex-col items-center justify-center
            border-2 border-dashed rounded-xl cursor-pointer
            transition-all duration-200
            ${dragOver 
              ? 'border-pink-400 bg-pink-500/20 scale-[1.02]' 
              : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
            }
          `}
        >
          <div className={`text-4xl mb-2 transition-transform ${dragOver ? 'scale-125' : ''}`}>
            ＋
          </div>
          <div className="text-sm text-gray-400 text-center px-2">
            {dragOver ? '松开上传' : placeholder}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            点击或拖拽
          </div>
        </div>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className={`${aspectClasses[aspectRatio]} flex flex-col items-center justify-center bg-gray-700 rounded-xl`}>
          {/* Progress bar */}
          <div className="w-3/4 h-2 bg-gray-600 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-gray-300">
            上传中... {progress}%
          </div>
        </div>
      )}

      {/* Uploaded State - Preview */}
      {value && !uploading && (
        <div 
          className={`${aspectClasses[aspectRatio]} relative group rounded-xl overflow-hidden bg-gray-800`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Preview */}
          {isVideo ? (
            <video
              src={value}
              className="w-full h-full object-cover"
              muted
              loop
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
          ) : (
            <img
              src={value}
              alt={placeholder}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.style.display = 'none';
              }}
            />
          )}

          {/* Drag overlay */}
          {dragOver && (
            <div className="absolute inset-0 bg-pink-500/50 flex items-center justify-center">
              <span className="text-white font-bold">替换素材</span>
            </div>
          )}

          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
            <button
              onClick={handleReplace}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center gap-2"
            >
              🔄 替换
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500/50 hover:bg-red-500/70 rounded-lg text-sm flex items-center gap-2"
            >
              🗑️ 删除
            </button>
          </div>

          {/* Delete button (always visible on corner) */}
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-500 rounded-full text-xs flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 text-red-400 text-xs text-center">
          {error}
        </div>
      )}
    </div>
  );
}
