"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MaleIcon from "@/components/icons/MaleIcon";
import FemaleIcon from "@/components/icons/FemaleIcon";
import AdminHeader from "@/components/AdminHeader";

interface RegistrationEntry {
  index: number;
  submittedAt: string;
  legalName: string;
  nickname: string;
  age: string;
  gender: string;
  orientation: string;
  school: string;
  major: string;
  grade: string;
  wechat: string;
  douyin: string;
  email: string;
  phone: string;
  fileUrl: string;
  introduction: string;
}

export default function AdminListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <AdminListContent />
    </Suspense>
  );
}

function AdminListContent() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<RegistrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"男" | "女">("男");
  const [selectedEntry, setSelectedEntry] = useState<RegistrationEntry | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<RegistrationEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Handle URL params on initial load
  useEffect(() => {
    const genderParam = searchParams.get("gender");
    if (genderParam === "男" || genderParam === "女") {
      setActiveTab(genderParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/list?gender=${activeTab}`);
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const data = await response.json();
      const fetchedEntries = data.entries || [];
      setEntries(fetchedEntries);

      // Auto-select entry from URL param on initial load
      if (initialLoad) {
        const idParam = searchParams.get("id");
        if (idParam) {
          const targetEntry = fetchedEntries.find(
            (e: RegistrationEntry) => e.index === parseInt(idParam)
          );
          if (targetEntry) {
            setSelectedEntry(targetEntry);
          }
        }
        setInitialLoad(false);
      }
    } catch (err) {
      setError("加载数据失败，请刷新重试");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleDelete = async (entry: RegistrationEntry) => {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/list?gender=${activeTab}&rowIndex=${entry.index}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error("Failed to delete");
      }
      // Close modals and refresh data
      setDeleteConfirm(null);
      setSelectedEntry(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError("删除失败，请重试");
    } finally {
      setDeleting(false);
    }
  };

  // Delete Confirmation Modal
  if (deleteConfirm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">确认删除</h2>
          <p className="text-gray-600 mb-6">
            确定要删除 <span className="font-semibold">{deleteConfirm.legalName}</span> 的报名信息吗？
            <br />
            <span className="text-red-500 text-sm">此操作不可撤销！</span>
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
              className="px-6 py-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm)}
              disabled={deleting}
              className="px-6 py-3 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Detail Modal
  if (selectedEntry) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setSelectedEntry(null)}
            className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← 返回列表
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-8 pb-6 border-b">
              {selectedEntry.fileUrl && !selectedEntry.fileUrl.startsWith("[") && (() => {
                const urls = selectedEntry.fileUrl.split(" | ").filter((url) => url && !url.startsWith("["));
                return urls.length > 0 ? (
                  <div className="mb-4">
                    {urls.length === 1 ? (
                      // Single file
                      urls[0].includes("video") || urls[0].endsWith(".mp4") || urls[0].endsWith(".mov") ? (
                        <video
                          src={urls[0]}
                          controls
                          className="max-h-64 mx-auto rounded-lg"
                        />
                      ) : (
                        <img
                          src={urls[0]}
                          alt={selectedEntry.legalName}
                          className="max-h-64 mx-auto rounded-lg object-cover"
                        />
                      )
                    ) : (
                      // Multiple files - show grid
                      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                        {urls.map((url, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                            {url.includes("video") || url.endsWith(".mp4") || url.endsWith(".mov") ? (
                              <video
                                src={url}
                                controls
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={url}
                                alt={`${selectedEntry.legalName} ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedEntry.legalName}
              </h1>
              {selectedEntry.nickname && (
                <p className="text-gray-500 mt-1">昵称：{selectedEntry.nickname}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-4 text-sm text-gray-600">
                <span>{selectedEntry.age} 岁</span>
                <span>•</span>
                <span>{selectedEntry.school}</span>
                <span>•</span>
                <span>{selectedEntry.grade}</span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem label="性别" value={selectedEntry.gender} />
              <InfoItem label="取向" value={selectedEntry.orientation || "-"} />
              <InfoItem label="学校" value={selectedEntry.school} />
              <InfoItem label="专业" value={selectedEntry.major} />
              <InfoItem label="年级" value={selectedEntry.grade} />
              <InfoItem label="年龄" value={selectedEntry.age} />
              <InfoItem label="微信号" value={selectedEntry.wechat} copyable />
              <InfoItem label="邮箱" value={selectedEntry.email} copyable />
              <InfoItem label="手机号" value={selectedEntry.phone} copyable />
              <InfoItem label="抖音号" value={selectedEntry.douyin || "-"} />
            </div>

            {/* Introduction */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-500 mb-3">自我介绍</h3>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {selectedEntry.introduction || "-"}
              </p>
            </div>

            {/* File Links */}
            {selectedEntry.fileUrl && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-3">照片/视频链接</h3>
                {selectedEntry.fileUrl.startsWith("[") ? (
                  <p className="text-gray-400 text-sm">{selectedEntry.fileUrl}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEntry.fileUrl.split(" | ").filter(url => url && !url.startsWith("[")).map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">{index + 1}.</span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all"
                        >
                          {url}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timestamp */}
            <div className="mt-6 pt-6 border-t text-center text-sm text-gray-400">
              提交时间：{formatDate(selectedEntry.submittedAt)}
            </div>

            {/* Delete Button */}
            <div className="mt-6 pt-6 border-t">
              <button
                onClick={() => setDeleteConfirm(selectedEntry)}
                className="w-full py-3 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                🗑️ 删除此报名
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <AdminHeader />

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("男")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === "男"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <MaleIcon className={`w-5 h-5 ${activeTab === "男" ? "text-white" : "text-blue-500"}`} />
            男嘉宾 ({activeTab === "男" ? entries.length : "..."})
          </button>
          <button
            onClick={() => setActiveTab("女")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === "女"
                ? "bg-pink-500 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FemaleIcon className={`w-5 h-5 ${activeTab === "女" ? "text-white" : "text-pink-500"}`} />
            女嘉宾 ({activeTab === "女" ? entries.length : "..."})
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500">暂无报名数据</p>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-4 px-6 font-medium text-gray-600">#</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600">姓名</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600">年龄</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600">学校</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600">专业</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600">年级</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600">提交时间</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.index}
                      className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td className="py-4 px-6 text-gray-500">{entry.index}</td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{entry.legalName}</div>
                        {entry.nickname && (
                          <div className="text-sm text-gray-500">{entry.nickname}</div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-700">{entry.age}</td>
                      <td className="py-4 px-6 text-gray-700">{entry.school}</td>
                      <td className="py-4 px-6 text-gray-700 max-w-[200px] truncate">
                        {entry.major}
                      </td>
                      <td className="py-4 px-6 text-gray-700">{entry.grade}</td>
                      <td className="py-4 px-6 text-gray-500 text-sm">
                        {formatDate(entry.submittedAt)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEntry(entry);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            查看
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(entry);
                            }}
                            className="text-red-500 hover:text-red-700 font-medium text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats */}
        {!loading && entries.length > 0 && (
          <div className="mt-6 text-center text-gray-500 text-sm">
            共 {entries.length} 位{activeTab === "男" ? "男" : "女"}嘉宾报名
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for info items
function InfoItem({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="font-medium text-gray-900 flex items-center justify-between">
        <span className="break-all">{value}</span>
        {copyable && value && value !== "-" && (
          <button
            onClick={handleCopy}
            className="ml-2 text-gray-400 hover:text-gray-600 text-sm"
            title="复制"
          >
            📋
          </button>
        )}
      </div>
    </div>
  );
}
