"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MaleIcon from "@/components/icons/MaleIcon";
import FemaleIcon from "@/components/icons/FemaleIcon";
import AdminHeader from "@/components/AdminHeader";

// Fallback image component with error handling
function SafeImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [error, setError] = useState(false);
  
  if (error || !src) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
        <span className="text-4xl">📷</span>
      </div>
    );
  }
  
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

interface RegistrationEntry {
  index: number;
  legalName: string;
  nickname: string;
  age: string;
  gender: string;
  school: string;
  grade: string;
  fileUrl: string;
}

// Helper to split multiple file URLs
const getFileUrls = (fileUrl: string): string[] => {
  if (!fileUrl) return [];
  return fileUrl.split(" | ").filter((url) => url && !url.startsWith("["));
};

export default function GalleryPage() {
  const [entries, setEntries] = useState<RegistrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "男" | "女">("all");
  const [selectedEntry, setSelectedEntry] = useState<RegistrationEntry | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const [maleRes, femaleRes] = await Promise.all([
        fetch("/api/admin/list?gender=男"),
        fetch("/api/admin/list?gender=女"),
      ]);

      const maleData = await maleRes.json();
      const femaleData = await femaleRes.json();

      const maleEntries = (maleData.entries || []).map((e: RegistrationEntry) => ({
        ...e,
        gender: "男",
      }));
      const femaleEntries = (femaleData.entries || []).map((e: RegistrationEntry) => ({
        ...e,
        gender: "女",
      }));

      setEntries([...maleEntries, ...femaleEntries]);
    } catch (err) {
      setError("加载数据失败，请刷新重试");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (filter === "all") return true;
    return entry.gender === filter;
  });

  // Filter out entries without valid file URLs
  const entriesWithMedia = filteredEntries.filter(
    (entry) => getFileUrls(entry.fileUrl).length > 0
  );

  // Count total media files
  const totalMediaCount = entriesWithMedia.reduce(
    (acc, entry) => acc + getFileUrls(entry.fileUrl).length,
    0
  );

  const isVideo = (url: string) => {
    return url.includes("video") || url.endsWith(".mp4") || url.endsWith(".mov") || url.endsWith(".webm");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">加载照片集...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <AdminHeader />

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === "all"
                ? "bg-gray-800 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            全部 ({entriesWithMedia.length})
          </button>
          <button
            onClick={() => setFilter("男")}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              filter === "男"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <MaleIcon className={`w-4 h-4 ${filter === "男" ? "text-white" : "text-blue-500"}`} />
            男嘉宾
          </button>
          <button
            onClick={() => setFilter("女")}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              filter === "女"
                ? "bg-pink-500 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FemaleIcon className={`w-4 h-4 ${filter === "女" ? "text-white" : "text-pink-500"}`} />
            女嘉宾
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Gallery Grid */}
        {entriesWithMedia.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500">暂无照片/视频</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {entriesWithMedia.map((entry) => {
              const urls = getFileUrls(entry.fileUrl);
              const firstUrl = urls[0];
              return (
                <div
                  key={`${entry.gender}-${entry.index}`}
                  className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedEntry(entry);
                    setCurrentMediaIndex(0);
                  }}
                >
                  {/* Media */}
                  <div className="aspect-square relative">
                    {isVideo(firstUrl) ? (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <video
                          src={firstUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <SafeImage
                        src={firstUrl}
                        alt={entry.legalName}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Multiple files badge */}
                    {urls.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        +{urls.length - 1}
                      </div>
                    )}
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <div className="flex items-center gap-2">
                      {entry.gender === "男" ? (
                        <MaleIcon className="w-4 h-4 text-blue-400" />
                      ) : (
                        <FemaleIcon className="w-4 h-4 text-pink-400" />
                      )}
                      <span className="text-white font-medium text-sm truncate">
                        {entry.nickname || entry.legalName}
                      </span>
                    </div>
                    <div className="text-white/70 text-xs mt-1">
                      {entry.age}岁 · {entry.school}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedEntry && (() => {
          const urls = getFileUrls(selectedEntry.fileUrl);
          const currentUrl = urls[currentMediaIndex] || urls[0];
          return (
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedEntry(null)}
            >
              <button
                className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl z-10"
                onClick={() => setSelectedEntry(null)}
              >
                ×
              </button>

              {/* Navigation arrows */}
              {urls.length > 1 && (
                <>
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-2xl z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMediaIndex((prev) => (prev === 0 ? urls.length - 1 : prev - 1));
                    }}
                  >
                    ‹
                  </button>
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-2xl z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMediaIndex((prev) => (prev === urls.length - 1 ? 0 : prev + 1));
                    }}
                  >
                    ›
                  </button>
                </>
              )}

              <div
                className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Media */}
                <div className="relative bg-black">
                  {isVideo(currentUrl) ? (
                    <video
                      key={currentUrl}
                      src={currentUrl}
                      controls
                      autoPlay
                      className="w-full max-h-[60vh] object-contain"
                    />
                  ) : (
                    <SafeImage
                      src={currentUrl}
                      alt={selectedEntry.legalName}
                      className="w-full max-h-[60vh] object-contain"
                    />
                  )}

                  {/* Media counter */}
                  {urls.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                      {currentMediaIndex + 1} / {urls.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail strip */}
                {urls.length > 1 && (
                  <div className="p-3 bg-gray-100 flex gap-2 overflow-x-auto">
                    {urls.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentMediaIndex
                            ? "border-pink-500"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        {isVideo(url) ? (
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center text-xl">
                            🎬
                          </div>
                        ) : (
                          <SafeImage
                            src={url}
                            alt={`${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedEntry.gender === "男" ? (
                        <MaleIcon className="w-6 h-6 text-blue-500" />
                      ) : (
                        <FemaleIcon className="w-6 h-6 text-pink-500" />
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {selectedEntry.legalName}
                        </h3>
                        {selectedEntry.nickname && (
                          <p className="text-gray-500 text-sm">昵称：{selectedEntry.nickname}</p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/admin/list?gender=${selectedEntry.gender}&id=${selectedEntry.index}`}
                      className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      查看完整资料
                    </Link>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-gray-600">
                    <span>{selectedEntry.age} 岁</span>
                    <span>•</span>
                    <span>{selectedEntry.school}</span>
                    <span>•</span>
                    <span>{selectedEntry.grade}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Stats */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          共 {entriesWithMedia.length} 位嘉宾，{totalMediaCount} 个文件
        </div>
      </div>
    </div>
  );
}
