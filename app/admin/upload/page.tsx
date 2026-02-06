"use client";

import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { upload } from "@vercel/blob/client";

export default function AdminUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError("");
    setUploadedUrl("");
    setProgress(0);
    
    try {
      // Convert HEIC if needed
      let uploadFile = file;
      if (file.type === "image/heic" || file.type === "image/heif" || 
          file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
        setError("正在转换 iPhone 照片格式...");
        const heic2any = (await import("heic2any")).default;
        const blob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.9,
        });
        const resultBlob = Array.isArray(blob) ? blob[0] : blob;
        uploadFile = new File([resultBlob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
        setError("");
      }
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const ext = uploadFile.name.split(".").pop() || "jpg";
      const filename = `admin-upload_${timestamp}.${ext}`;
      
      // Use client-side direct upload (bypasses 4.5MB serverless limit)
      const blob = await upload(filename, uploadFile, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setProgress(percent);
        },
      });
      
      setUploadedUrl(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(uploadedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <AdminHeader />
        
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">文件上传工具</h1>
          <p className="text-gray-500 mb-6">上传图片或视频获取 URL，最大支持 500MB</p>
          
          {/* File Input */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              选择文件
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setUploadedUrl("");
                setError("");
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
            />
            {file && (
              <div className="mt-3">
                <p className="text-sm text-gray-600">
                  已选择: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
                {file.type.startsWith("image/") && (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="mt-2 max-h-48 rounded-lg"
                  />
                )}
              </div>
            )}
          </div>
          
          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-3 rounded-lg font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? `上传中... ${progress}%` : "上传文件"}
          </button>
          
          {/* Progress Bar */}
          {uploading && progress > 0 && (
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          
          {/* Success */}
          {uploadedUrl && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium mb-2">✅ 上传成功！</p>
              <p className="text-sm text-gray-600 mb-3">复制下面的 URL 到 Google Sheets：</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={uploadedUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  {copied ? "已复制!" : "复制"}
                </button>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">预览：</p>
                {uploadedUrl.match(/\.(mp4|mov|webm|avi|wmv)$/i) ? (
                  <video
                    src={uploadedUrl}
                    controls
                    className="max-h-64 rounded-lg"
                  />
                ) : (
                  <img
                    src={uploadedUrl}
                    alt="Uploaded"
                    className="max-h-64 rounded-lg"
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Instructions */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-medium text-gray-900 mb-3">使用步骤：</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
              <li>选择要上传的文件（支持图片和视频，最大 500MB）</li>
              <li>iPhone HEIC 格式照片会自动转换为 JPEG</li>
              <li>点击"上传文件"，等待上传完成</li>
              <li>复制生成的 URL</li>
              <li>粘贴到需要使用的地方</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
