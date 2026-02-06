'use client';

import { useEventStream } from '@/hooks/useEventStream';
import { useSound } from '@/hooks/useSound';
import { EventPhase, phaseNames, lightColors, SlideSlot } from '@/lib/event-state';
import Link from 'next/link';
import { useState } from 'react';

// Phase flow for the event
const phaseFlow: EventPhase[] = [
  'waiting',
  'intro',
  'female_intro',
  'male_enter',
  'male_question',
  'talent',
  'vcr1',
  'qa1',
  'vcr2',
  'qa2',
  'reversal',
  'heart_reveal',
  'final_qa',
  'final_choice',
  'result',
];

// Sound effect definitions for DJ panel
const soundEffects = [
  { name: 'maleEnter', label: '男嘉宾入场', emoji: '👤', color: 'bg-blue-500' },
  { name: 'lightOff', label: '灭灯', emoji: '🌑', color: 'bg-gray-500' },
  { name: 'burst', label: '爆灯', emoji: '💖', color: 'bg-pink-500' },
  { name: 'success', label: '牵手成功', emoji: '💕', color: 'bg-green-500' },
  { name: 'fail', label: '牵手失败', emoji: '💔', color: 'bg-red-500' },
  { name: 'vcrStart', label: 'VCR开始', emoji: '🎬', color: 'bg-purple-500' },
  { name: 'roundStart', label: '环节开始', emoji: '🎯', color: 'bg-orange-500' },
  { name: 'countdown', label: '倒计时', emoji: '⏱️', color: 'bg-cyan-500' },
  { name: 'applause', label: '掌声', emoji: '👏', color: 'bg-yellow-500' },
] as const;

export default function DirectorPage() {
  const { 
    state, 
    femaleGuests, 
    maleGuests,
    slides,
    connected, 
    updateState, 
    setLight, 
    resetLights, 
    resetEvent,
    showSlide,
    hideSlide,
  } = useEventStream();
  const { play, setMasterVolume, getMasterVolume } = useSound();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);

  // Update both local state AND master volume (affects playing sounds)
  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
    setMasterVolume(newVolume); // This updates currently playing sounds too!
  };

  // Play sound (uses master volume automatically)
  const playSound = (soundName: string) => {
    play(soundName as Parameters<typeof play>[0]);
    setLastPlayed(soundName);
    setTimeout(() => setLastPlayed(null), 300);
  };

  const currentMale = maleGuests.find(g => g.id === state.currentMaleGuest);

  // Navigate phases
  const goToPhase = async (phase: EventPhase) => {
    // Sound effects are manually triggered from DJ panel
    await updateState({ 
      phase, 
      message: phaseNames[phase],
      vcrPlaying: phase === 'vcr1' || phase === 'vcr2',
      vcrType: phase === 'vcr1' ? 'vcr1' : phase === 'vcr2' ? 'vcr2' : null,
    });
  };

  const nextPhase = async () => {
    const currentIndex = phaseFlow.indexOf(state.phase);
    if (currentIndex < phaseFlow.length - 1) {
      await goToPhase(phaseFlow[currentIndex + 1]);
    }
  };

  const prevPhase = async () => {
    const currentIndex = phaseFlow.indexOf(state.phase);
    if (currentIndex > 0) {
      await goToPhase(phaseFlow[currentIndex - 1]);
    }
  };

  // Start new round with a male guest
  const startNewRound = async (maleId: number) => {
    // Sound effects are manually triggered from DJ panel
    await resetLights();
    await updateState({
      currentMaleGuest: maleId,
      currentRound: maleId,
      phase: 'male_enter',
      heartChoice: null,
      showingProfile: null,
      showingTag: null,
      vcrPlaying: false,
      message: `男嘉宾 ${maleId} 入场`,
    });
  };

  // Toggle VCR
  const toggleVCR = async () => {
    await updateState({ vcrPlaying: !state.vcrPlaying });
  };

  // Show female guest profile
  const showProfile = async (guestId: number | null) => {
    await updateState({ showingProfile: guestId, showingTag: null });
  };

  // Reveal tag
  const revealTag = async (tagIndex: number) => {
    await updateState({ showingTag: tagIndex });
  };

  // Light counts
  const onCount = Object.values(state.lights).filter(s => s === 'on').length;
  const burstCount = Object.values(state.lights).filter(s => s === 'burst').length;
  const offCount = Object.values(state.lights).filter(s => s === 'off').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎬 导演控制台</h1>
          <p className="text-gray-400 text-sm">非诚勿扰 2026</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/director/setup" className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
            ⚙️ 设置
          </Link>
          <div className={`px-3 py-1 rounded-full text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {connected ? '● 已连接' : '○ 连接中...'}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Phase Control */}
        <div className="space-y-4">
          {/* Current Phase */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4">当前环节</h2>
            <div className="text-center py-4 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl">
              <div className="text-3xl font-bold">{phaseNames[state.phase]}</div>
              <div className="text-gray-400 mt-1">第 {state.currentRound} 轮</div>
            </div>
            
            {/* Phase Navigation */}
            <div className="flex gap-2 mt-4">
              <button 
                onClick={prevPhase}
                className="flex-1 py-3 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                ← 上一步
              </button>
              <button 
                onClick={nextPhase}
                className="flex-1 py-3 bg-pink-600 rounded-lg hover:bg-pink-500"
              >
                下一步 →
              </button>
            </div>
          </div>

          {/* Quick Phase Selector */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">快速跳转</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {phaseFlow.map((phase) => (
                <button
                  key={phase}
                  onClick={() => goToPhase(phase)}
                  className={`py-2 px-3 rounded-lg transition-all ${
                    state.phase === phase
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {phaseNames[phase]}
                </button>
              ))}
            </div>
          </div>

          {/* Female Guest Introduction Control */}
          <div className="bg-gradient-to-br from-pink-900/50 to-rose-900/50 rounded-xl p-4 border border-pink-500/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">👩 女嘉宾介绍</h2>
              {state.currentFemaleIntro && (
                <button
                  onClick={() => updateState({ currentFemaleIntro: null })}
                  className="px-3 py-1 bg-red-500/50 hover:bg-red-500 rounded-lg text-sm"
                >
                  ✕ 关闭
                </button>
              )}
            </div>
            
            {/* Current intro status */}
            {state.currentFemaleIntro ? (
              <div className="mb-3 p-3 bg-pink-500/20 rounded-lg text-center">
                <span className="text-pink-300">正在展示：</span>
                <span className="font-bold text-lg ml-2">
                  {state.currentFemaleIntro}号女嘉宾
                </span>
              </div>
            ) : (
              <div className="mb-3 p-3 bg-gray-700/50 rounded-lg text-center text-gray-400 text-sm">
                点击下方选择要介绍的女嘉宾
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => {
                  const current = state.currentFemaleIntro || 0;
                  const prev = current <= 1 ? 12 : current - 1;
                  updateState({ currentFemaleIntro: prev });
                }}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                ← 上一位
              </button>
              <button
                onClick={() => {
                  const current = state.currentFemaleIntro || 0;
                  const next = current >= 12 ? 1 : current + 1;
                  updateState({ currentFemaleIntro: next });
                }}
                className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg"
              >
                下一位 →
              </button>
            </div>

            {/* Guest selection grid */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) => {
                const guest = femaleGuests.find(g => g.id === id);
                const isActive = state.currentFemaleIntro === id;
                return (
                  <button
                    key={id}
                    onClick={() => updateState({ currentFemaleIntro: isActive ? null : id })}
                    className={`py-2 rounded-lg transition-all text-xs ${
                      isActive
                        ? 'bg-pink-500 ring-2 ring-pink-300'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-bold">#{id}</div>
                    <div className="truncate px-1 opacity-70">
                      {guest?.nickname || guest?.name || '-'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VCR Control */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">VCR 控制</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  playSound('vcrStart');
                  updateState({ vcrType: 'vcr1', vcrPlaying: true });
                }}
                className={`flex-1 py-3 rounded-lg ${state.vcrType === 'vcr1' && state.vcrPlaying ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                ▶️ VCR1
              </button>
              <button
                onClick={() => {
                  playSound('vcrStart');
                  updateState({ vcrType: 'vcr2', vcrPlaying: true });
                }}
                className={`flex-1 py-3 rounded-lg ${state.vcrType === 'vcr2' && state.vcrPlaying ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                ▶️ VCR2
              </button>
              <button
                onClick={() => updateState({ vcrPlaying: false })}
                className="py-3 px-4 bg-red-600 rounded-lg hover:bg-red-500"
              >
                ⏹️
              </button>
            </div>
          </div>

          {/* Final Result Buttons */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">最终结果</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  playSound('success');
                  updateState({ 
                    phase: 'result', 
                    message: '💕 牵手成功！' 
                  });
                }}
                className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-500 rounded-lg hover:from-green-500 hover:to-emerald-400 font-bold"
              >
                💕 牵手成功
              </button>
              <button
                onClick={() => {
                  playSound('fail');
                  updateState({ 
                    phase: 'result', 
                    message: '💔 牵手失败' 
                  });
                }}
                className="flex-1 py-4 bg-gradient-to-r from-red-600 to-rose-500 rounded-lg hover:from-red-500 hover:to-rose-400 font-bold"
              >
                💔 牵手失败
              </button>
            </div>
          </div>

          {/* DJ Panel - Sound Effects */}
          <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">🎧 DJ 音效台</h2>
              <div className="text-sm font-mono text-pink-300 bg-black/30 px-2 py-1 rounded">
                {Math.round(volume * 100)}%
              </div>
            </div>
            
            {/* Volume Slider */}
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setVolume(0)} 
                  className="text-xl hover:scale-110 transition-transform"
                >
                  🔇
                </button>
                <div className="flex-1 relative h-8 flex items-center">
                  {/* Track background */}
                  <div className="absolute inset-x-0 h-3 bg-gray-700 rounded-full" />
                  {/* Filled track */}
                  <div 
                    className="absolute left-0 h-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${volume * 100}%` }}
                  />
                  {/* Input */}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {/* Thumb indicator */}
                  <div 
                    className="absolute w-5 h-5 bg-white rounded-full shadow-lg pointer-events-none transition-all"
                    style={{ left: `calc(${volume * 100}% - 10px)` }}
                  />
                </div>
                <button 
                  onClick={() => setVolume(1)} 
                  className="text-xl hover:scale-110 transition-transform"
                >
                  🔊
                </button>
              </div>
              {/* Quick volume buttons */}
              <div className="flex justify-center gap-2 mt-2">
                {[0.25, 0.5, 0.75, 1].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVolume(v)}
                    className={`px-3 py-1 text-xs rounded-full transition-all ${
                      Math.abs(volume - v) < 0.05
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-700/50 hover:bg-gray-600'
                    }`}
                  >
                    {Math.round(v * 100)}%
                  </button>
                ))}
              </div>
            </div>

            {/* Sound Effect Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {soundEffects.map(({ name, label, emoji, color }) => (
                <button
                  key={name}
                  onClick={() => playSound(name)}
                  className={`py-3 rounded-lg transition-all transform ${
                    lastPlayed === name 
                      ? `${color} scale-95 ring-2 ring-white` 
                      : 'bg-gray-700/80 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{emoji}</div>
                  <div className="text-xs">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Slide Control Panel */}
          <div className="bg-gradient-to-br from-indigo-900/50 to-blue-900/50 rounded-xl p-4 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">📽️ 幻灯片</h2>
              <Link
                href="/director/slides"
                className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
              >
                管理
              </Link>
            </div>

            {/* Current slide status */}
            {state.currentSlide ? (
              <div className="mb-3 p-2 bg-indigo-500/20 rounded-lg flex items-center justify-between">
                <span className="text-sm">
                  正在展示: <strong>{slides.find(s => s.id === state.currentSlide)?.name || state.currentSlide}</strong>
                </span>
                <button
                  onClick={hideSlide}
                  className="px-2 py-1 bg-red-500/50 hover:bg-red-500 rounded text-xs"
                >
                  ✕ 关闭
                </button>
              </div>
            ) : (
              <div className="mb-3 p-2 bg-gray-700/50 rounded-lg text-center text-gray-400 text-sm">
                当前无幻灯片
              </div>
            )}

            {/* Preset slides - quick access */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {slides.filter(s => !s.id.startsWith('custom')).map((slide) => (
                <button
                  key={slide.id}
                  onClick={() => slide.imageUrl ? showSlide(slide.id) : null}
                  disabled={!slide.imageUrl}
                  className={`py-2 px-3 rounded-lg transition-all ${
                    state.currentSlide === slide.id
                      ? 'bg-indigo-500 ring-2 ring-indigo-300'
                      : slide.imageUrl
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {slide.name}
                </button>
              ))}
            </div>

            {/* Custom slides */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2">自定义幻灯片</div>
              <div className="flex gap-2 flex-wrap">
                {slides.filter(s => s.id.startsWith('custom')).map((slide, i) => (
                  <button
                    key={slide.id}
                    onClick={() => slide.imageUrl ? showSlide(slide.id) : null}
                    disabled={!slide.imageUrl}
                    className={`py-1.5 px-3 rounded-lg text-xs transition-all ${
                      state.currentSlide === slide.id
                        ? 'bg-indigo-500 ring-2 ring-indigo-300'
                        : slide.imageUrl
                          ? 'bg-gray-700 hover:bg-gray-600'
                          : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    #{i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Lights Control */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">灯光状态</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-400">亮: {onCount}</span>
              <span className="text-pink-400">爆: {burstCount}</span>
              <span className="text-gray-400">灭: {offCount}</span>
            </div>
          </div>
          
          {/* Reset Lights Button */}
          <button
            onClick={resetLights}
            className="w-full py-2 mb-4 bg-yellow-600 rounded-lg hover:bg-yellow-500"
          >
            🔄 重置所有灯光
          </button>

          {/* Light Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) => {
              const status = state.lights[id] || 'on';
              const guest = femaleGuests.find(g => g.id === id);
              return (
                <div key={id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">#{id}</span>
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: lightColors[status] }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mb-2 truncate">
                    {guest?.nickname || guest?.name || '-'}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setLight(id, 'on')}
                      className={`flex-1 py-1 text-xs rounded ${status === 'on' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                    >
                      亮
                    </button>
                    <button
                      onClick={() => setLight(id, 'off')}
                      className={`flex-1 py-1 text-xs rounded ${status === 'off' ? 'bg-gray-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                    >
                      灭
                    </button>
                    <button
                      onClick={() => setLight(id, 'burst')}
                      className={`flex-1 py-1 text-xs rounded ${status === 'burst' ? 'bg-pink-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                    >
                      爆
                    </button>
                  </div>
                  {/* Profile button */}
                  <button
                    onClick={() => showProfile(state.showingProfile === id ? null : id)}
                    className={`w-full mt-2 py-1 text-xs rounded ${state.showingProfile === id ? 'bg-purple-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                  >
                    {state.showingProfile === id ? '隐藏资料' : '显示资料'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column - Male Guests & Actions */}
        <div className="space-y-4">
          {/* Male Guest Selector */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">男嘉宾</h2>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((id) => {
                const male = maleGuests.find(g => g.id === id);
                const isActive = state.currentMaleGuest === id;
                return (
                  <button
                    key={id}
                    onClick={() => startNewRound(id)}
                    className={`py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-500 ring-2 ring-blue-300'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-lg font-bold">#{id}</div>
                    <div className="text-xs text-gray-300 truncate px-1">
                      {male?.nickname || male?.name || '-'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Male Info */}
          {currentMale && (
            <div className="bg-gray-800 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-3">当前男嘉宾</h2>
              <div className="flex items-center gap-4">
                {currentMale.photo ? (
                  <img src={currentMale.photo} alt={currentMale.name} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-blue-500 flex items-center justify-center text-2xl">
                    👤
                  </div>
                )}
                <div>
                  <div className="font-bold text-lg">{currentMale.nickname || currentMale.name}</div>
                  <div className="text-gray-400 text-sm">{currentMale.school}</div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">快捷链接</h2>
            <div className="space-y-2">
              <Link 
                href="/stage" 
                target="_blank"
                className="block w-full py-3 bg-purple-600 rounded-lg text-center hover:bg-purple-500"
              >
                🖥️ 打开主屏幕
              </Link>
              <Link 
                href="/director/setup" 
                className="block w-full py-3 bg-gray-700 rounded-lg text-center hover:bg-gray-600"
              >
                ⚙️ 嘉宾数据设置
              </Link>
            </div>
          </div>

          {/* Guest Control Links */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">女嘉宾控制页</h2>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) => (
                <Link
                  key={id}
                  href={`/guest/${id}`}
                  target="_blank"
                  className="py-2 bg-gray-700 rounded text-center text-sm hover:bg-gray-600"
                >
                  #{id}
                </Link>
              ))}
            </div>
          </div>

          {/* Reset Event */}
          <div className="bg-gray-800 rounded-xl p-4">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-3 bg-red-600/50 rounded-lg hover:bg-red-600"
            >
              🔄 重置活动
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">确认重置活动？</h3>
            <p className="text-gray-400 mb-6">这将重置所有灯光状态和流程进度。</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  await resetEvent();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-3 bg-red-600 rounded-lg hover:bg-red-500"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
