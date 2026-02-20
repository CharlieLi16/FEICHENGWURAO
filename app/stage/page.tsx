'use client';

import { useEventStream } from '@/hooks/useEventStream';
import { useSound } from '@/hooks/useSound';
import { lightColors, phaseNames, LightStatus, FemaleGuest, getGuestPhotos } from '@/lib/event-state';
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
        className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg transition-all duration-300 ${isBurst ? 'animate-bounce' : ''}`}
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
        
        {/* Heart indicator */}
        <div className="absolute -bottom-1 -right-1 text-lg drop-shadow-lg">
          {isActive ? '❤️' : '💔'}
        </div>
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

// Fullscreen Female Guest Profile (PPT-style matching template)
function FemaleGuestFullscreen({ guest }: { guest: FemaleGuest }) {
  const photos = getGuestPhotos(guest);
  const mainPhoto = photos[0];
  const sidePhotos = photos.slice(1, 3); // Up to 2 additional photos

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background - Pink/Coral gradient with decorative border */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-rose-100 to-pink-50" />
      
      {/* Decorative pink border frame */}
      <div className="absolute inset-3 md:inset-6 border-[6px] border-pink-400/60 rounded-2xl" />
      
      {/* Corner decorations - ribbon style */}
      <div className="absolute top-0 left-8 w-16 h-24 bg-gradient-to-b from-pink-400 to-pink-300 opacity-60" 
           style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%, 0 100%)' }} />
      <div className="absolute top-0 right-8 w-16 h-24 bg-gradient-to-b from-pink-400 to-pink-300 opacity-60"
           style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 100%)' }} />
      
      {/* Main content layout */}
      <div className="relative h-full flex p-6 md:p-10">
        
        {/* LEFT SIDE - Main Photo with frame */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-[40%]">
          {/* Photo frame - custom template or fallback */}
          <div className="relative transform -rotate-2 hover:rotate-0 transition-transform duration-300">
            {/* Custom photo frame image */}
            <div className="relative">
              <img 
                src="/assets/images/template/photo-frame.png" 
                alt="" 
                className="w-72 h-auto md:w-96 drop-shadow-2xl"
              />
              {/* Photo positioned inside the frame */}
              <div className="absolute inset-0 flex items-center justify-center p-6 md:p-8">
                {mainPhoto ? (
                  <img
                    src={mainPhoto}
                    alt={guest.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center rounded">
                    <span className="text-8xl">👩</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Decorative ribbon/tape on corner (hidden if using custom frame) */}
            <div className="absolute -top-3 -right-3 w-16 h-8 bg-gradient-to-r from-red-300 to-red-400 transform rotate-12 opacity-80"
                 style={{ 
                   backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.3) 3px, rgba(255,255,255,0.3) 6px)'
                 }} />
          </div>
          
          {/* Guest number badge */}
          <div className="mt-4 md:mt-6">
            <span className="inline-block bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xl md:text-2xl font-bold px-6 md:px-8 py-2 md:py-3 rounded-lg shadow-lg transform -rotate-1">
              {guest.id}号女嘉宾
            </span>
          </div>
        </div>
        
        {/* RIGHT SIDE - Info section */}
        <div className="flex-1 flex flex-col pl-4 md:pl-8">
          
          {/* Top row: Name frame + Side photos */}
          <div className="flex items-start justify-between mb-4 md:mb-6">
            {/* Name in decorative frame */}
            <div className="relative">
              {/* Ornate frame border */}
              <div className="border-2 border-rose-600 rounded-lg px-6 md:px-10 py-2 md:py-3 bg-white/50"
                   style={{
                     borderStyle: 'double',
                     borderWidth: '4px',
                   }}>
                <h1 className="text-3xl md:text-5xl font-bold text-rose-700 font-serif tracking-wide">
                  {guest.nickname || guest.name}
                </h1>
              </div>
              {/* Small decorative dots */}
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-rose-500 rounded-full" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-rose-500 rounded-full" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </div>
            
            {/* Side circular photos */}
            <div className="flex gap-2 md:gap-3">
              {sidePhotos.map((photo, index) => (
                <div key={index} className="relative">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </div>
                  {/* Decorative ribbon */}
                  <div className="absolute -top-2 -right-2 w-6 h-4 bg-gradient-to-r from-red-300 to-red-400 transform rotate-45 opacity-80"
                       style={{ 
                         backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                       }} />
                </div>
              ))}
              {/* Placeholder if no side photos */}
              {sidePhotos.length === 0 && (
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-pink-200 border-4 border-white shadow-lg flex items-center justify-center text-2xl">
                  💕
                </div>
              )}
            </div>
          </div>
          
          {/* Introduction box */}
          <div className="flex-1 flex flex-col">
            <div className="bg-gradient-to-b from-pink-200/80 to-pink-100/80 rounded-2xl p-4 md:p-6 shadow-inner flex-1 max-h-[50vh] overflow-auto">
              <p className="text-base md:text-xl text-rose-800 leading-relaxed">
                {guest.introduction || `我是${guest.nickname || guest.name}，很高兴认识大家！`}
              </p>
              {/* Ellipsis decoration */}
              <div className="text-center mt-4 text-rose-400 text-2xl tracking-widest">···</div>
            </div>
            
            {/* Tags row */}
            <div className="flex justify-center gap-3 md:gap-4 mt-4 md:mt-6">
              {guest.tags.filter(t => t).slice(0, 3).map((tag, index) => (
                <div 
                  key={index}
                  className="px-4 md:px-8 py-2 md:py-3 bg-pink-100 border-2 border-pink-300 rounded-xl text-rose-700 font-medium text-sm md:text-base shadow-md hover:bg-pink-200 transition-colors"
                >
                  {tag}
                </div>
              ))}
              {/* Fill empty tag slots */}
              {guest.tags.filter(t => t).length < 3 && Array.from({ length: 3 - guest.tags.filter(t => t).length }).map((_, i) => (
                <div 
                  key={`empty-${i}`}
                  className="px-4 md:px-8 py-2 md:py-3 bg-pink-50 border-2 border-pink-200 rounded-xl text-pink-300 text-sm md:text-base"
                >
                  {guest.school || guest.major || '标签'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Logo in bottom right */}
      <div className="absolute bottom-4 right-6 flex items-center gap-2 opacity-80">
        <Image
          src="/assets/images/tandon-cssa.png"
          alt="Tandon CSSA"
          width={48}
          height={48}
          className="rounded-lg"
        />
        <div className="text-rose-600 font-bold">
          <div className="text-sm">TANDON CSSA</div>
          <div className="text-xs text-rose-400">中国学生学者联合会</div>
        </div>
      </div>
      
      {/* Floating heart decorations */}
      <div className="absolute top-12 left-6 text-3xl animate-pulse opacity-40">💕</div>
      <div className="absolute bottom-1/4 left-10 text-2xl animate-pulse opacity-30" style={{ animationDelay: '0.5s' }}>💗</div>
      <div className="absolute top-1/4 right-6 text-4xl animate-pulse opacity-30" style={{ animationDelay: '1s' }}>💖</div>
    </div>
  );
}

// Fullscreen Slide Display
function SlideOverlay({ imageUrl, slideName, blur = 0 }: { imageUrl: string; slideName: string; blur?: number }) {
  return (
    <div className="fixed inset-0 z-[100]">
      <img
        src={imageUrl}
        alt={slideName}
        style={{ filter: blur > 0 ? `blur(${blur}px)` : undefined }}
        className="w-full h-full object-cover"
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

  // Background style - custom image or fallback gradient
  const blurValue = state.backgroundBlur || 0;
  const backgroundStyle = state.stageBackground
    ? {
        backgroundImage: `url(${state.stageBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  return (
    <div className="min-h-screen text-white overflow-hidden relative">
      {/* Background Layer (with blur) */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: state.stageBackground 
            ? undefined 
            : 'linear-gradient(to bottom right, #111827, #581c87, #831843)',
          ...backgroundStyle,
          filter: blurValue > 0 ? `blur(${blurValue}px)` : undefined,
          transform: blurValue > 0 ? 'scale(1.1)' : undefined, // Prevent blur edge artifacts
        }}
      />

      {/* Slide Overlay - highest priority, displays over everything */}
      {currentSlide?.imageUrl && (
        <SlideOverlay imageUrl={currentSlide.imageUrl} slideName={currentSlide.name} blur={blurValue} />
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

      {/* Header - Time display (toggles with H key) */}
      <header className={`relative z-10 p-4 md:p-6 transition-all duration-300 ${showRoundInfo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-end">
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
          <div className="grid grid-cols-6 gap-4 md:gap-6 mb-6 md:mb-8">
            {[1, 2, 3, 4, 5, 6].map((id) => {
              const guest = femaleGuests.find(g => g.id === id);
              const photos = guest ? getGuestPhotos(guest) : [];
              return (
                <GuestLight
                  key={id}
                  guestId={id}
                  status={state.lights[id] || 'on'}
                  name={guest?.nickname || guest?.name}
                  photo={photos[0]}
                />
              );
            })}
          </div>
          
          {/* Bottom row: 7-12 */}
          <div className="grid grid-cols-6 gap-4 md:gap-6">
            {[7, 8, 9, 10, 11, 12].map((id) => {
              const guest = femaleGuests.find(g => g.id === id);
              const photos = guest ? getGuestPhotos(guest) : [];
              return (
                <GuestLight
                  key={id}
                  guestId={id}
                  status={state.lights[id] || 'on'}
                  name={guest?.nickname || guest?.name}
                  photo={photos[0]}
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
                const photos = getGuestPhotos(guest);
                return (
                  <>
                    <div className="text-center mb-6">
                      {photos[0] ? (
                        <img src={photos[0]} alt={guest.name} className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-pink-400" />
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
