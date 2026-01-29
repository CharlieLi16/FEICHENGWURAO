import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen gradient-bg-subtle relative overflow-hidden">
      {/* Decorative hearts */}
      <div className="absolute top-20 left-10 text-6xl opacity-20 animate-float">💕</div>
      <div className="absolute top-40 right-20 text-4xl opacity-20 animate-float" style={{ animationDelay: "1s" }}>💗</div>
      <div className="absolute bottom-40 left-20 text-5xl opacity-20 animate-float" style={{ animationDelay: "2s" }}>💖</div>
      <div className="absolute bottom-20 right-10 text-6xl opacity-20 animate-float" style={{ animationDelay: "0.5s" }}>💝</div>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Warning banner */}
        <div className="w-full max-w-2xl mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
          <p className="text-amber-800 text-sm">
            ⚠️‼️ 如遇登录或上传问题，请将相关资料发送至邮箱{" "}
            <a href="mailto:yl11475@nyu.edu" className="font-semibold underline hover:text-amber-900">
              yl11475@nyu.edu
            </a>
          </p>
        </div>

        {/* Main content */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <Image
              src="/assets/images/tandon-cssa.png"
              alt="NYU Tandon CSSA Logo"
              width={150}
              height={150}
              className="mx-auto"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            NYU Tandon CSSA 2026
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold gradient-bg bg-clip-text text-transparent mb-6">
            非诚勿扰
          </h2>
          <p className="text-xl text-gray-600 mb-2">嘉宾报名</p>
          <p className="text-gray-500">找到你的 Mr./Ms. Right ✨</p>
        </div>

        {/* Registration buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
          {/* Male guest button */}
          <Link href="/register/male" className="flex-1">
            <div className="card p-8 text-center cursor-pointer border-2 border-transparent hover:border-blue-400 group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👨</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">男嘉宾报名</h3>
              <p className="text-gray-500">Male Guest</p>
              <div className="mt-4 inline-flex items-center text-blue-600 font-medium">
                点击报名
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Female guest button */}
          <Link href="/register/female" className="flex-1">
            <div className="card p-8 text-center cursor-pointer border-2 border-transparent hover:border-pink-400 group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👩</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">女嘉宾报名</h3>
              <p className="text-gray-500">Female Guest</p>
              <div className="mt-4 inline-flex items-center text-pink-600 font-medium">
                点击报名
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>© 2026 NYU Tandon CSSA</p>
          <p className="mt-2">与爱相遇，缘来是你 💕</p>
        </footer>
      </main>
    </div>
  );
}
