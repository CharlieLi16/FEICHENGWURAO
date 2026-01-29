'use client';

import { useEventStream } from '@/hooks/useEventStream';
import { phaseNames, LightStatus, lightColors } from '@/lib/event-state';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function GuestControlPage() {
  const params = useParams();
  const guestId = parseInt(params.id as string);
  const { state, femaleGuests, maleGuests, setLight, connected, error } = useEventStream();
  const [isChanging, setIsChanging] = useState(false);

  const currentLight = state.lights[guestId] || 'on';
  const guest = femaleGuests.find(g => g.id === guestId);
  const currentMale = maleGuests.find(g => g.id === state.currentMaleGuest);

  const handleLightChange = async (newStatus: LightStatus) => {
    if (isChanging || currentLight === newStatus) return;
    
    // Prevent changing from 'off' back to 'on' (灭灯后不能重新亮灯)
    if (currentLight === 'off' && newStatus === 'on') {
      return;
    }
    
    // Prevent changing from 'burst' (爆灯后不能改变)
    if (currentLight === 'burst') {
      return;
    }

    setIsChanging(true);
    await setLight(guestId, newStatus);
    setIsChanging(false);
  };

  if (isNaN(guestId) || guestId < 1 || guestId > 12) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">无效的嘉宾编号</h1>
          <p className="text-gray-400">请使用 1-12 之间的编号</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-purple-900 text-white">
      {/* Header */}
      <header className="p-4 text-center border-b border-white/10">
        <div className={`inline-block px-3 py-1 rounded-full text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {connected ? '● 已连接' : '○ 连接中...'}
        </div>
        <h1 className="text-xl font-bold mt-2">
          {guest?.nickname || guest?.name || `女嘉宾 ${guestId}`}
        </h1>
        <p className="text-gray-400 text-sm">#{guestId} 号位</p>
      </header>

      {/* Current Phase Info */}
      <div className="p-4 bg-white/5">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">当前环节</div>
          <div className="text-lg font-semibold">{phaseNames[state.phase]}</div>
          {currentMale && (
            <div className="mt-2 text-pink-300">
              👤 {currentMale.nickname || currentMale.name || `男嘉宾 ${state.currentMaleGuest}`}
            </div>
          )}
        </div>
      </div>

      {/* Current Light Status */}
      <div className="p-8 flex flex-col items-center">
        <div 
          className="w-40 h-40 rounded-full flex items-center justify-center text-6xl shadow-2xl transition-all duration-500"
          style={{ 
            backgroundColor: lightColors[currentLight],
            boxShadow: currentLight !== 'off' ? `0 0 60px ${lightColors[currentLight]}` : 'none',
          }}
        >
          {currentLight === 'on' && '💡'}
          {currentLight === 'off' && '🌑'}
          {currentLight === 'burst' && '💖'}
        </div>
        <div className="mt-4 text-2xl font-bold">
          {currentLight === 'on' && '亮灯中'}
          {currentLight === 'off' && '已灭灯'}
          {currentLight === 'burst' && '爆灯中 💕'}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="p-4 space-y-4">
        {/* 灭灯 Button */}
        <button
          onClick={() => handleLightChange('off')}
          disabled={isChanging || currentLight === 'off' || currentLight === 'burst'}
          className={`w-full py-6 rounded-2xl text-2xl font-bold transition-all ${
            currentLight === 'off' || currentLight === 'burst'
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-500 active:scale-95'
          }`}
        >
          {currentLight === 'off' ? '已灭灯' : '灭灯 🌑'}
        </button>

        {/* 爆灯 Button */}
        <button
          onClick={() => handleLightChange('burst')}
          disabled={isChanging || currentLight === 'off' || currentLight === 'burst'}
          className={`w-full py-6 rounded-2xl text-2xl font-bold transition-all ${
            currentLight === 'burst'
              ? 'bg-pink-500 text-white cursor-not-allowed'
              : currentLight === 'off'
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 active:scale-95 animate-pulse'
          }`}
        >
          {currentLight === 'burst' ? '已爆灯 💖' : '爆灯 💖'}
        </button>
      </div>

      {/* Rules reminder */}
      <div className="p-4 mx-4 bg-white/5 rounded-xl text-sm text-gray-400">
        <p className="font-semibold text-white mb-2">💡 操作说明</p>
        <ul className="space-y-1">
          <li>• <span className="text-gray-300">灭灯</span>：对当前男嘉宾不感兴趣</li>
          <li>• <span className="text-pink-400">爆灯</span>：非常喜欢，将进入终选舞台</li>
          <li>• 灭灯后不可重新亮灯</li>
          <li>• 爆灯后状态不可更改</li>
        </ul>
      </div>

      {/* Message display */}
      {state.message && (
        <div className="p-4 text-center text-gray-400 text-sm">
          {state.message}
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Loading overlay */}
      {isChanging && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
