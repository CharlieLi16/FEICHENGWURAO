'use client';

import { useEventStream } from '@/hooks/useEventStream';
import { useSound } from '@/hooks/useSound';
import { lightColors, phaseNames, LightStatus, FemaleGuest } from '@/lib/event-state';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

// Light component for each female guest
function GuestLight({ 
  guestId, 
  status, 
  name, 
  photo 
}: { 
  guestId: number; 
  status: LightStatus; 
  name?: string;
  photo?: string;
}) {
  const color = lightColors[status];
  const isActive = status !== 'off';
  const isBurst = status === 'burst';

  return (
    <div className={`relative flex flex-col items-center transition-all duration-500 ${isActive ? 'scale-100' : 'scale-95 opacity-60'}`}>
      {/* Light glow effect */}
      <div 
        className={`absolute -inset-4 rounded-full blur-xl transition-all duration-500 ${isBurst ? 'animate-pulse' : ''}`}
        style={{ 
          backgroundColor: color,
          opacity: isActive ? 0.4 : 0,
        }}
      />
      
      {/* Main light circle */}
      <div 
        className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg transition-all duration-300 ${isBurst ? 'animate-bounce' : ''}`}
        style={{ 
          backgroundColor: color,
          boxShadow: isActive ? `0 0 30px ${color}` : 'none',
        }}
      >
        {photo ? (
          <img 
            src={photo} 
            alt={name || `${guestId}`}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          guestId
        )}
      </div>
      
      {/* Name label */}
      <div className={`mt-3 text-center transition-all ${isActive ? 'text-white' : 'text-gray-500'}`}>
        <div className="font-semibold text-sm md:text-base">{name || `女嘉宾 ${guestId}`}</div>
        <div className="text-xs opacity-70">
          {status === 'on' && '亮灯'}
          {status === 'off' && '灭灯'}
          {status === 'burst' && '💖 爆灯'}
        </div>
      </div>
    </div>
  );
}

// Male guest profile card
function MaleGuestCard({ 
  name, 
  photo, 
  introduction 
}: { 
  name?: string; 
  photo?: string; 
  introduction?: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-4">
        {photo ? (
          <img src={photo} alt={name} className="w-24 h-24 rounded-xl object-cover" />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-blue-500 flex items-center justify-center text-4xl">
            👤
          </div>
        )}
        <div>
          <h3 className="text-2xl font-bold text-white">{name || '男嘉宾'}</h3>
          <p className="text-blue-300">正在寻找真爱...</p>
        </div>
      </div>
      {introduction && (
        <p className="text-gray-300 text-sm leading-relaxed">{introduction}</p>
      )}
    </div>
  );
}

// VCR Video Player
function VCRPlayer({ url, playing, onClose }: { url?: string; playing: boolean; onClose: () => void }) {
  if (!url || !playing) return null;
  
  const handleVideoEnd = () => {
    onClose();
  };
  
  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-2xl transition-all shadow-lg"
        title="关闭 VCR"
      >
        ✕
      </button>
      
      <div className="w-full max-w-4xl aspect-video">
        {url.includes('youtube') || url.includes('youtu.be') ? (
          <iframe
            src={url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/') + '?autoplay=1'}
            className="w-full h-full rounded-lg"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : url.includes('bilibili') ? (
          <iframe
            src={url}
            className="w-full h-full rounded-lg"
            allow="autoplay"
            allowFullScreen
          />
        ) : (
          <video
            src={url}
            className="w-full h-full rounded-lg"
            autoPlay
            controls
            onEnded={handleVideoEnd}
          />
        )}
      </div>
    </div>
  );
}

// Fullscreen Female Guest Profile (PPT-style)
function FemaleGuestFullscreen({ guest }: { guest: FemaleGuest }) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Pink gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-300 via-pink-200 to-white" />
      
      {/* Decorative border */}
      <div className="absolute inset-4 md:inset-8 border-4 border-pink-400/50 rounded-3xl" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col md:flex-row items-center justify-center p-8 md:p-16">
        {/* Left side - Info */}
        <div className="flex-1 flex flex-col justify-center md:pr-8 text-center md:text-left mb-8 md:mb-0">
          {/* Name */}
          <h1 className="text-5xl md:text-7xl font-bold text-pink-600 mb-6 font-serif">
            {guest.nickname || guest.name}
          </h1>
          
          {/* Basic info */}
          <div className="text-2xl md:text-3xl text-pink-500 mb-4 space-y-2">
            <p className="font-medium">
              {guest.age && `${guest.age}岁`}
              {guest.zodiac && ` ${guest.zodiac}`}
            </p>
            <p>{guest.school}</p>
            {guest.major && (
              <p className="text-xl md:text-2xl text-pink-400">
                Major: {guest.major}
              </p>
            )}
          </div>
          
          {/* Introduction */}
          {guest.introduction && (
            <div className="mt-6 p-4 bg-white/50 rounded-2xl">
              <p className="text-xl md:text-2xl text-pink-600 leading-relaxed">
                {guest.introduction}
              </p>
            </div>
          )}
        </div>
        
        {/* Right side - Photo */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Love letter decoration */}
          <div className="absolute top-8 right-1/3 md:right-1/4 text-6xl md:text-8xl animate-bounce">
            💌
          </div>
          
          {/* Photo card */}
          <div className="relative">
            {/* Photo container with shadow */}
            <div className="relative bg-white rounded-3xl p-3 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform">
              {guest.photo ? (
                <img
                  src={guest.photo}
                  alt={guest.name}
                  className="w-64 h-80 md:w-80 md:h-96 object-cover rounded-2xl"
                />
              ) : (
                <div className="w-64 h-80 md:w-80 md:h-96 bg-gradient-to-br from-pink-200 to-pink-300 rounded-2xl flex items-center justify-center">
                  <span className="text-8xl">👩</span>
                </div>
              )}
              
              {/* Heart decoration on photo */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white text-xl shadow-lg">
                  💗
                </div>
              </div>
            </div>
            
            {/* Guest number badge */}
            <div className="mt-6 text-center">
              <span className="inline-block bg-gradient-to-r from-pink-500 to-rose-500 text-white text-2xl md:text-3xl font-bold px-8 py-3 rounded-full shadow-lg">
                {guest.id}号女嘉宾
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Logo */}
      <div className="absolute bottom-6 right-8 flex items-center gap-3">
        <Image
          src="/assets/images/tandon-cssa.png"
          alt="Tandon CSSA"
          width={60}
          height={60}
          className="rounded-lg"
        />
        <div className="text-pink-600 font-bold">
          <div className="text-lg">TANDON CSSA</div>
          <div className="text-xs text-pink-400">中国学生学者联合会</div>
        </div>
      </div>
      
      {/* Floating hearts decoration */}
      <div className="absolute top-1/4 left-8 text-4xl animate-pulse opacity-50">💕</div>
      <div className="absolute bottom-1/3 left-16 text-3xl animate-pulse opacity-40" style={{ animationDelay: '0.5s' }}>💗</div>
      <div className="absolute top-1/3 right-8 text-5xl animate-pulse opacity-30" style={{ animationDelay: '1s' }}>💖</div>
    </div>
  );
}

// Fullscreen Slide Display
function SlideOverlay({ imageUrl, slideName }: { imageUrl: string; slideName: string }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <img
        src={imageUrl}
        alt={slideName}
        className="max-w-full max-h-full w-auto h-auto object-contain"
      />
    </div>
  );
}

export default function StagePage() {
  const { state, femaleGuests, maleGuests, slides, connected, error, updateState } = useEventStream();
  const { play } = useSound();
  const [time, setTime] = useState(new Date());
  const [showRoundInfo, setShowRoundInfo] = useState(true);
  const prevLightsRef = useRef<Record<number, LightStatus>>({});

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut: H to toggle round info
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setShowRoundInfo(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Play sound effects when lights change
  useEffect(() => {
    const prevLights = prevLightsRef.current;
    
    // Check each light for changes
    for (let i = 1; i <= 12; i++) {
      const prev = prevLights[i];
      const curr = state.lights[i];
      
      if (prev && prev !== curr) {
        if (curr === 'off') {
          play('lightOff');
        } else if (curr === 'burst') {
          play('burst');
        }
      }
    }
    
    // Update ref
    prevLightsRef.current = { ...state.lights };
  }, [state.lights, play]);

  const currentMale = maleGuests.find(g => g.id === state.currentMaleGuest);
  const vcrUrl = state.vcrType === 'vcr1' ? currentMale?.vcr1Url : currentMale?.vcr2Url;

  // Count lights
  const onCount = Object.values(state.lights).filter(s => s === 'on').length;
  const burstCount = Object.values(state.lights).filter(s => s === 'burst').length;

  // Get current female for intro
  const currentFemaleForIntro = femaleGuests.find(g => g.id === state.currentFemaleIntro);

  // Get current slide for display
  const currentSlide = state.currentSlide ? slides.find(s => s.id === state.currentSlide) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 text-white overflow-hidden">
      {/* Slide Overlay - highest priority, displays over everything */}
      {currentSlide?.imageUrl && (
        <SlideOverlay imageUrl={currentSlide.imageUrl} slideName={currentSlide.name} />
      )}

      {/* VCR Overlay */}
      <VCRPlayer 
        url={vcrUrl} 
        playing={state.vcrPlaying} 
        onClose={() => updateState({ vcrPlaying: false })}
      />

      {/* Fullscreen Female Introduction (PPT-style) */}
      {currentFemaleForIntro && (
        <FemaleGuestFullscreen guest={currentFemaleForIntro} />
      )}

      {/* Header */}
      <header className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              纽约非诚勿扰
            </h1>
            <p className="text-gray-400 text-sm">NYU Tandon CSSA 2026</p>
          </div>
          
          <div className="text-right">
            <div className="text-3xl md:text-5xl font-mono font-bold text-pink-400">
              {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className={`text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
              {connected ? '● 已连接' : '○ 连接中...'}
            </div>
          </div>
        </div>
      </header>

      {/* Phase Title - Press H to toggle */}
      <div className={`text-center py-4 md:py-6 transition-all duration-300 ${showRoundInfo ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 py-0 overflow-hidden'}`}>
        <div className="inline-block bg-white/10 backdrop-blur-sm rounded-full px-8 py-3">
          <span className="text-sm text-gray-400 mr-2">第 {state.currentRound} 轮</span>
          <span className="text-xl md:text-2xl font-bold">{phaseNames[state.phase]}</span>
        </div>
        {state.message && state.message !== phaseNames[state.phase] && (
          <p className="mt-2 text-gray-300">{state.message}</p>
        )}
      </div>

      {/* Main Content */}
      <main className="relative z-10 px-4 md:px-8 pb-8">
        {/* Light Status Summary */}
        <div className="text-center mb-6">
          <span className="text-2xl md:text-3xl font-bold text-green-400">{onCount + burstCount}</span>
          <span className="text-gray-400 mx-2">盏灯亮着</span>
          {burstCount > 0 && (
            <span className="text-pink-400">
              ({burstCount} 爆灯 💖)
            </span>
          )}
        </div>

        {/* Female Guests Lights - Two rows of 6 */}
        <div className="max-w-6xl mx-auto mb-8">
          {/* Top row: 1-6 */}
          <div className="grid grid-cols-6 gap-2 md:gap-4 mb-6 md:mb-8">
            {[1, 2, 3, 4, 5, 6].map((id) => {
              const guest = femaleGuests.find(g => g.id === id);
              return (
                <GuestLight
                  key={id}
                  guestId={id}
                  status={state.lights[id] || 'on'}
                  name={guest?.nickname || guest?.name}
                  photo={guest?.photo}
                />
              );
            })}
          </div>
          
          {/* Bottom row: 7-12 */}
          <div className="grid grid-cols-6 gap-2 md:gap-4">
            {[7, 8, 9, 10, 11, 12].map((id) => {
              const guest = femaleGuests.find(g => g.id === id);
              return (
                <GuestLight
                  key={id}
                  guestId={id}
                  status={state.lights[id] || 'on'}
                  name={guest?.nickname || guest?.name}
                  photo={guest?.photo}
                />
              );
            })}
          </div>
        </div>

        {/* Male Guest Card (when relevant) */}
        {['male_enter', 'male_question', 'talent', 'final_choice'].includes(state.phase) && currentMale && (
          <div className="mt-8">
            <MaleGuestCard
              name={currentMale.nickname || currentMale.name}
              photo={currentMale.photo}
              introduction={currentMale.introduction}
            />
          </div>
        )}

        {/* Female Guest Profile (when showing) */}
        {state.showingProfile && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40 p-4">
            <div className="bg-gradient-to-br from-pink-900/90 to-purple-900/90 backdrop-blur-lg rounded-3xl p-8 max-w-lg w-full">
              {(() => {
                const guest = femaleGuests.find(g => g.id === state.showingProfile);
                if (!guest) return null;
                return (
                  <>
                    <div className="text-center mb-6">
                      {guest.photo ? (
                        <img src={guest.photo} alt={guest.name} className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-pink-400" />
                      ) : (
                        <div className="w-32 h-32 rounded-full mx-auto bg-pink-500 flex items-center justify-center text-5xl">
                          {state.showingProfile}
                        </div>
                      )}
                      <h3 className="text-3xl font-bold mt-4">{guest.nickname || guest.name}</h3>
                      <p className="text-pink-300">{guest.age}岁 · {guest.school}</p>
                    </div>
                    
                    {/* Tags */}
                    <div className="space-y-3">
                      {guest.tags.map((tag, index) => (
                        <div 
                          key={index}
                          className={`p-4 rounded-xl transition-all ${
                            state.showingTag === null || state.showingTag === index
                              ? 'bg-white/20'
                              : 'bg-white/5 opacity-50'
                          }`}
                        >
                          <div className="text-sm text-pink-300 mb-1">标签 {index + 1}</div>
                          <div className={`font-medium ${
                            state.showingTag === null || state.showingTag === index
                              ? 'text-white'
                              : 'text-gray-400 blur-sm'
                          }`}>
                            {tag}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Connection error toast */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full">
          {error}
        </div>
      )}

      {/* Decorative elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
