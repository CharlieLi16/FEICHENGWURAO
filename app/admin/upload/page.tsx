"use client";

import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";

export default function AdminUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError("");
    setUploadedUrl("");
    
    try {
      // Convert HEIC if needed
      let uploadFile = file;
      if (file.type === "image/heic" || file.type === "image/heif" || 
          file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
        const heic2any = (await import("heic2any")).default;
        const blob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.9,
        });
        const resultBlob = Array.isArray(blob) ? blob[0] : blob;
        uploadFile = new File([resultBlob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
      }
      
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", "admin-upload");
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("上传失败");
      }
      
      const data = await response.json();
      setUploadedUrl(data.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">照片上传工具</h1>
          <p className="text-gray-500 mb-6">上传照片获取 URL，用于替换 Google Sheets 中的链接</p>
          
          {/* File Input */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              选择照片
            </label>
            <input
              type="file"
              accept="image/*"
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
            {uploading ? "上传中..." : "上传照片"}
          </button>
          
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
                <img
                  src={uploadedUrl}
                  alt="Uploaded"
                  className="max-h-64 rounded-lg"
                />
              </div>
            </div>
          )}
          
          {/* Instructions */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-medium text-gray-900 mb-3">使用步骤：</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
              <li>选择要上传的照片（支持 iPhone HEIC 格式）</li>
              <li>点击"上传照片"</li>
              <li>复制生成的 URL</li>
              <li>打开 Google Sheets，找到对应的报名行</li>
              <li>把"照片/视频链接"那列的内容替换成新 URL</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
