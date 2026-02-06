'use client';

import { useState, useRef, useCallback } from 'react';
import { upload } from '@vercel/blob/client';

interface SkeletonUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  placeholder?: string;
  accept?: string;
  className?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | 'auto';
  allowUrlInput?: boolean; // Allow pasting video URLs directly
}

export default function SkeletonUpload({
  value,
  onChange,
  placeholder = '上传素材',
  accept = 'image/*,video/*',
  className = '',
  aspectRatio = 'auto',
  allowUrlInput = false,
}: SkeletonUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Aspect ratio classes
  const aspectClasses = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    'auto': 'min-h-[120px]',
  };

  // Handle file upload - uses client-side direct upload to bypass 4.5MB limit
  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = file.name.split('.').pop() || '';
      const filename = `upload_${timestamp}.${ext}`;

      console.log('[SkeletonUpload] Starting client-side upload:', filename, file.size);

      // Client-side direct upload to Vercel Blob (bypasses serverless 4.5MB limit)
      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/token',
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setProgress(percent);
        },
      });

      console.log('[SkeletonUpload] Upload success:', blob.url);
      
      // Short delay to show 100%
      setTimeout(() => {
        onChange(blob.url);
        setUploading(false);
        setProgress(0);
      }, 300);
    } catch (err) {
      console.error('[SkeletonUpload] Upload error:', err);
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

  // Check if value is video (by extension or common video hosting patterns)
  const isVideo = value && (
    value.includes('.mp4') || 
    value.includes('.webm') || 
    value.includes('.mov') || 
    value.includes('.MOV') ||
    value.includes('.m4v') ||
    value.includes('.avi') ||
    value.includes('youtube.com') ||
    value.includes('youtu.be') ||
    value.includes('bilibili.com') ||
    value.includes('vimeo.com')
  );
  
  // Check if it's an embeddable video platform
  const isEmbedVideo = value && (
    value.includes('youtube.com') ||
    value.includes('youtu.be') ||
    value.includes('bilibili.com') ||
    value.includes('vimeo.com')
  );
  
  // Check if value is a valid URL (not placeholder text)
  const isValidUrl = value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:'));

  // Handle URL input submission
  const handleUrlSubmit = () => {
    if (urlInput.trim() && (urlInput.startsWith('http://') || urlInput.startsWith('https://'))) {
      onChange(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    } else {
      setError('请输入有效的URL (以 http:// 或 https:// 开头)');
    }
  };

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
      {!value && !uploading && !showUrlInput && (
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
          {allowUrlInput && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUrlInput(true);
              }}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
            >
              或粘贴视频链接
            </button>
          )}
        </div>
      )}

      {/* URL Input State */}
      {!value && !uploading && showUrlInput && (
        <div className={`${aspectClasses[aspectRatio]} flex flex-col items-center justify-center bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-xl p-4`}>
          <div className="text-sm text-gray-300 mb-2">粘贴视频链接</div>
          <div className="text-xs text-gray-500 mb-3">支持 YouTube, Bilibili, 或直接视频URL</div>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="https://..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleUrlSubmit}
              className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 rounded text-sm"
            >
              确定
            </button>
            <button
              onClick={() => {
                setShowUrlInput(false);
                setUrlInput('');
              }}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
            >
              取消
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              上传文件
            </button>
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

      {/* Invalid URL Warning */}
      {value && !uploading && !isValidUrl && (
        <div className={`${aspectClasses[aspectRatio]} flex flex-col items-center justify-center bg-yellow-900/30 border-2 border-dashed border-yellow-500 rounded-xl p-4`}>
          <div className="text-yellow-500 text-2xl mb-2">⚠️</div>
          <div className="text-yellow-400 text-xs text-center">无效的URL</div>
          <div className="text-yellow-500/70 text-xs mt-1 break-all max-h-16 overflow-hidden">{value.substring(0, 50)}...</div>
          <button onClick={handleDelete} className="mt-2 px-3 py-1 bg-red-500/50 hover:bg-red-500 rounded text-xs">删除</button>
        </div>
      )}

      {/* Uploaded State - Preview */}
      {value && !uploading && isValidUrl && (
        <div 
          className={`${aspectClasses[aspectRatio]} relative group rounded-xl overflow-hidden bg-gray-800`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Preview */}
          {isEmbedVideo ? (
            // Show link preview for embedded video platforms
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 p-4">
              <div className="text-4xl mb-2">
                {value.includes('youtube') || value.includes('youtu.be') ? '▶️' : 
                 value.includes('bilibili') ? '📺' : '🎬'}
              </div>
              <div className="text-sm text-gray-300 text-center">视频链接已设置</div>
              <div className="text-xs text-gray-500 mt-1 break-all max-w-full line-clamp-2">{value}</div>
            </div>
          ) : isVideo ? (
            <video
              src={value}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => e.currentTarget.pause()}
              onError={(e) => {
                console.error('[SkeletonUpload] Video failed to load:', value);
              }}
            />
          ) : (
            <img
              src={value}
              alt={placeholder}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('[SkeletonUpload] Image failed to load:', value);
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
              🔄 替换文件
            </button>
            {allowUrlInput && (
              <button
                onClick={() => {
                  onChange(null);
                  setShowUrlInput(true);
                }}
                className="px-4 py-2 bg-blue-500/50 hover:bg-blue-500/70 rounded-lg text-sm flex items-center gap-2"
              >
                🔗 使用链接
              </button>
            )}
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
