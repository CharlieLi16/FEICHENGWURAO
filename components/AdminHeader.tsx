"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Image
            src="/assets/images/tandon-cssa.png"
            alt="Logo"
            width={50}
            height={50}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
            <p className="text-gray-500 text-sm">纽约非诚勿扰 2026</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
        >
          退出登录
        </button>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin"
          className={`px-4 py-2 rounded-lg transition-colors ${
            isActive("/admin")
              ? "bg-gray-200 text-gray-900 font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          📊 统计概览
        </Link>
        <Link
          href="/admin/list"
          className={`px-4 py-2 rounded-lg transition-colors ${
            isActive("/admin/list")
              ? "bg-gray-200 text-gray-900 font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          📋 嘉宾列表
        </Link>
        <Link
          href="/admin/gallery"
          className={`px-4 py-2 rounded-lg transition-colors ${
            isActive("/admin/gallery")
              ? "bg-gray-200 text-gray-900 font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          🖼️ 照片集
        </Link>
      </div>
    </div>
  );
}
