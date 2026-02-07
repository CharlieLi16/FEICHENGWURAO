'use client';

import { useSound, SOUNDS, SoundName } from '@/hooks/useSound';
import Link from 'next/link';
import { useState } from 'react';

export default function TestSoundsPage() {
  const { play, playUrl } = useSound();
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState('');

  const handlePlay = (name: SoundName) => {
    setLastPlayed(name);
    play(name);
  };

  const soundList: { name: SoundName; label: string; emoji: string }[] = [
    { name: 'lightOn', label: '亮灯', emoji: '💡' },
    { name: 'lightOff', label: '灭灯', emoji: '🌑' },
    { name: 'burst', label: '爆灯', emoji: '💖' },
    { name: 'maleEnter', label: '男嘉宾入场', emoji: '👤' },
    { name: 'success', label: '牵手成功', emoji: '💕' },
    { name: 'fail', label: '牵手失败', emoji: '💔' },
    { name: 'vcrStart', label: 'VCR开始', emoji: '🎬' },
    { name: 'lastPick', label: '权力反转', emoji: '🔄' },
    { name: 'countdown', label: '倒计时', emoji: '⏱️' },
    { name: 'applause', label: '掌声', emoji: '👏' },
    { name: 'ei', label: '诶？', emoji: '❓' },
    { name: 'uhoh', label: 'Uh Oh', emoji: '😬' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8">
        <Link href="/event" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← 返回活动系统
        </Link>
        <h1 className="text-3xl font-bold">🔊 音效测试</h1>
        <p className="text-gray-400 mt-2">点击按钮测试音效是否正常播放</p>
      </header>

      {/* Sound Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {soundList.map(({ name, label, emoji }) => (
          <button
            key={name}
            onClick={() => handlePlay(name)}
            className={`p-6 rounded-xl transition-all ${
              lastPlayed === name
                ? 'bg-pink-600 scale-105'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <div className="text-4xl mb-2">{emoji}</div>
            <div className="font-medium">{label}</div>
            <div className="text-xs text-gray-400 mt-1 break-all">
              {SOUNDS[name].split('/').pop()}
            </div>
          </button>
        ))}
      </div>

      {/* File Status */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">📁 文件状态检查</h2>
        <div className="space-y-2">
          {soundList.map(({ name, label }) => {
            const fileName = SOUNDS[name].split('/').pop();
            return (
              <div key={name} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <span>{label}</span>
                <code className="text-pink-400 text-sm">{fileName}</code>
              </div>
            );
          })}
        </div>
        <p className="text-gray-400 text-sm mt-4">
          💡 如果点击按钮没有声音，请检查：
        </p>
        <ul className="text-gray-400 text-sm mt-2 list-disc list-inside space-y-1">
          <li>文件是否放在 <code className="text-pink-400">public/assets/sounds/</code> 文件夹</li>
          <li>文件名是否正确（区分大小写）</li>
          <li>浏览器音量是否打开</li>
          <li>打开浏览器控制台 (F12) 查看错误信息</li>
        </ul>
      </div>

      {/* Custom URL Test */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">🔗 自定义URL测试</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="输入音频文件URL..."
            className="flex-1 bg-gray-700 rounded-lg px-4 py-3"
          />
          <button
            onClick={() => customUrl && playUrl(customUrl)}
            className="px-6 py-3 bg-pink-600 rounded-lg hover:bg-pink-500"
          >
            播放
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          例如: /assets/sounds/light-off.mp3
        </p>
      </div>
    </div>
  );
}
