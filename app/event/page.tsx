'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function EventLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 text-white">
      {/* Header */}
      <header className="p-6 text-center">
        <Image
          src="/assets/images/tandon-cssa.png"
          alt="NYU Tandon CSSA"
          width={80}
          height={80}
          className="mx-auto rounded-xl shadow-lg mb-4"
        />
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          纽约非诚勿扰
        </h1>
        <p className="text-gray-400 mt-2">NYU Tandon CSSA 2026 活动控制系统</p>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Director Access */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎬</span> 导演控制台
          </h2>
          <p className="text-gray-300 mb-4">
            控制活动流程、灯光状态、VCR播放等
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/director"
              className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-500 font-medium"
            >
              进入控制台
            </Link>
            <Link
              href="/director/setup"
              className="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              嘉宾设置
            </Link>
          </div>
        </div>

        {/* Stage Display */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🖥️</span> 主屏幕
          </h2>
          <p className="text-gray-300 mb-4">
            投影仪显示的主屏幕，展示灯光状态、嘉宾资料、VCR等
          </p>
          <Link
            href="/stage"
            target="_blank"
            className="inline-block px-6 py-3 bg-pink-600 rounded-lg hover:bg-pink-500 font-medium"
          >
            打开主屏幕（新窗口）
          </Link>
        </div>

        {/* Female Guest Controls */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span> 女嘉宾控制页
          </h2>
          <p className="text-gray-300 mb-4">
            女嘉宾使用手机控制自己的灯（亮灯/灭灯/爆灯）
          </p>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) => (
              <Link
                key={id}
                href={`/guest/${id}`}
                target="_blank"
                className="py-4 bg-pink-500/30 hover:bg-pink-500/50 rounded-xl text-center font-bold transition-colors"
              >
                #{id}
              </Link>
            ))}
          </div>
          <p className="text-gray-400 text-sm mt-3">
            💡 提示：让每位女嘉宾在手机上打开对应编号的链接
          </p>
        </div>

        {/* QR Code Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📱</span> 链接分享
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 mb-2">主屏幕链接</div>
              <code className="text-pink-400 break-all">/stage</code>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 mb-2">控制台链接</div>
              <code className="text-purple-400 break-all">/director</code>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 md:col-span-2">
              <div className="text-gray-400 mb-2">女嘉宾链接格式</div>
              <code className="text-green-400 break-all">/guest/[编号]</code>
              <span className="text-gray-500 ml-2">例如 /guest/1, /guest/2 ...</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <h3 className="font-bold text-amber-400 mb-3">📋 使用说明</h3>
          <ol className="space-y-2 text-gray-300 text-sm list-decimal list-inside">
            <li>先在 <strong>嘉宾设置</strong> 页面导入/设置嘉宾信息</li>
            <li>将 <strong>主屏幕</strong> 投影到现场大屏幕</li>
            <li>让每位女嘉宾用手机打开对应的 <strong>控制页面</strong></li>
            <li>导演在 <strong>控制台</strong> 控制活动流程</li>
            <li>确保所有设备连接同一网络</li>
          </ol>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center p-6 text-gray-500 text-sm">
        <p>© 2026 NYU Tandon CSSA</p>
        <Link href="/" className="text-pink-400 hover:underline mt-2 inline-block">
          返回报名首页
        </Link>
      </footer>
    </div>
  );
}
