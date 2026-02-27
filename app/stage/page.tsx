'use client';

import { useEventStream } from '@/hooks/useEventStream';
import { useSound } from '@/hooks/useSound';
import { lightColors, phaseNames, LightStatus, FemaleGuest, getGuestPhotos } from '@/lib/event-state';
import { ElementConfig, TemplateConfig, defaultTemplateConfig } from '@/lib/template-config';
import { useEffect, useState, useRef, useCallback } from 'react';
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
      {/* Light glow effect - enlarged +20% */}
      <div 
        className={`absolute -inset-8 rounded-full blur-2xl transition-all duration-500 ${isBurst ? 'animate-pulse' : ''}`}
        style={{ 
          backgroundColor: color,
          opacity: isActive ? 0.5 : 0,
        }}
      />
      
      {/* Main light circle - enlarged +20% (w-44 h-44 md:w-52 md:h-52) */}
      <div 
        className={`relative w-44 h-44 md:w-52 md:h-52 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg transition-all duration-300 ${isBurst ? 'animate-bounce' : ''}`}
        style={{ 
          backgroundColor: color,
          boxShadow: isActive ? `0 0 50px ${color}` : 'none',
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
        
        {/* Heart indicator - enlarged +20% */}
        <div className="absolute -bottom-4 -right-4 text-4xl drop-shadow-lg">
          {isActive ? '❤️' : '💔'}
        </div>
      </div>
      
      {/* Name label - enlarged +20% */}
      <div className={`mt-5 text-center transition-all ${isActive ? 'text-white' : 'text-gray-500'}`}>
        <div className="font-semibold text-lg md:text-xl">{name || `女嘉宾 ${guestId}`}</div>
        <div className="text-base opacity-70">
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

// Mini light for PiP overlay
function MiniLight({ status }: { status: 'on' | 'off' | 'burst' }) {
  return (
    <div className={`w-8 h-8 rounded-full transition-all ${
      status === 'on' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' :
      status === 'burst' ? 'bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)] animate-pulse' :
      'bg-gray-600'
    }`} />
  );
}

// Mini lights overlay for VCR PiP
function MiniLightsOverlay({ lights }: { lights: Record<number, 'on' | 'off' | 'burst'> }) {
  return (
    <div className="absolute top-4 left-4 z-[70] bg-black/70 backdrop-blur-sm rounded-xl p-4">
      <div className="grid grid-cols-6 gap-2 mb-2">
        {[1, 2, 3, 4, 5, 6].map(id => (
          <MiniLight key={id} status={lights[id] || 'on'} />
        ))}
      </div>
      <div className="grid grid-cols-6 gap-2">
        {[7, 8, 9, 10, 11, 12].map(id => (
          <MiniLight key={id} status={lights[id] || 'on'} />
        ))}
      </div>
    </div>
  );
}

// VCR Video Player - True fullscreen with PiP lights
// READ-ONLY: No close button - VCR is controlled only from Director panel
// Supports optional intro video that plays before main VCR
function VCRPlayer({ 
  url, 
  playing, 
  lights,
  introUrl,
  playingIntro
}: { 
  url?: string; 
  playing: boolean; 
  lights: Record<number, 'on' | 'off' | 'burst'>;
  introUrl?: string;
  playingIntro?: boolean;
}) {
  // Track if intro has finished (local state for seamless transition)
  const [introFinished, setIntroFinished] = useState(false);
  
  // Reset intro state when a new VCR session starts
  useEffect(() => {
    if (!playing) {
      setIntroFinished(false);
    }
  }, [playing]);
  
  if (!playing) return null;
  
  // Determine which video to show
  const showIntro = playingIntro && introUrl && !introFinished;
  const currentUrl = showIntro ? introUrl : url;
  
  if (!currentUrl) return null;
  
  const handleIntroEnded = () => {
    // Intro finished, switch to main VCR
    setIntroFinished(true);
  };
  
  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Mini lights PiP */}
      <MiniLightsOverlay lights={lights} />
      
      {/* Intro indicator */}
      {showIntro && (
        <div className="absolute top-4 left-4 z-10 bg-purple-600/80 px-4 py-2 rounded-full text-white text-sm font-medium animate-pulse">
          🎬 片头播放中...
        </div>
      )}
      
      {/* Video - true fullscreen */}
      {currentUrl.includes('youtube') || currentUrl.includes('youtu.be') ? (
        <iframe
          key={showIntro ? 'intro' : 'main'}
          src={currentUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/') + '?autoplay=1'}
          className="w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      ) : currentUrl.includes('bilibili') ? (
        <iframe
          key={showIntro ? 'intro' : 'main'}
          src={currentUrl}
          className="w-full h-full"
          allow="autoplay"
          allowFullScreen
        />
      ) : (
        <video
          key={showIntro ? 'intro' : 'main'}
          src={currentUrl}
          className="w-full h-full object-contain bg-black"
          autoPlay
          controls
          onEnded={showIntro ? handleIntroEnded : undefined}
        />
      )}
    </div>
  );
}

// Template element renderer
function TemplateElement({ 
  element, 
  children 
}: { 
  element: ElementConfig; 
  children?: React.ReactNode;
}) {
  if (!element.visible) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: element.zIndex,
  };

  return (
    <div style={style}>
      {element.type === 'image' && element.imageUrl && (
        <img
          src={element.imageUrl}
          alt=""
          className="w-full h-full object-contain"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      {children}
    </div>
  );
}

// Fullscreen Female Guest Profile (Config-based template)
function FemaleGuestFullscreen({ guest, templateConfig }: { guest: FemaleGuest; templateConfig: TemplateConfig }) {
  const photos = getGuestPhotos(guest);
  const mainPhoto = photos[0];
  const sidePhotos = photos.slice(1, 3);

  // Helper to get element config by ID
  const getElement = (id: string): ElementConfig | undefined => 
    templateConfig.elements.find(el => el.id === id);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background gradient (fallback) */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-rose-100 to-pink-50" />

      {/* Render template image elements */}
      {templateConfig.elements
        .filter(el => el.type === 'image' && el.visible)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(element => (
          <TemplateElement key={element.id} element={element} />
        ))}

      {/* Main Photo - positioned by config */}
      {(() => {
        const config = getElement('main-photo');
        if (!config?.visible) return null;
        return (
          <div 
            className="absolute overflow-hidden"
            style={{
              left: `${config.x}%`,
              top: `${config.y}%`,
              width: `${config.width}%`,
              height: `${config.height}%`,
              transform: `rotate(${config.rotation}deg)`,
              zIndex: config.zIndex,
            }}
          >
            {mainPhoto ? (
              <img src={mainPhoto} alt={guest.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center rounded-lg">
                <span className="text-6xl">👩</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Name Text - positioned by config */}
      {(() => {
        const config = getElement('name-text');
        if (!config?.visible) return null;
        return (
          <div 
            className="absolute flex items-center justify-center"
            style={{
              left: `${config.x}%`,
              top: `${config.y}%`,
              width: `${config.width}%`,
              height: `${config.height}%`,
              transform: `rotate(${config.rotation}deg)`,
              zIndex: config.zIndex,
            }}
          >
            <h1 className="text-3xl md:text-5xl font-bold text-rose-700 font-serif tracking-wide text-center">
              {guest.nickname || guest.name}
            </h1>
          </div>
        );
      })()}

      {/* Introduction Text - positioned by config */}
      {(() => {
        const config = getElement('intro-text');
        if (!config?.visible) return null;
        return (
          <div 
            className="absolute overflow-auto p-4"
            style={{
              left: `${config.x}%`,
              top: `${config.y}%`,
              width: `${config.width}%`,
              height: `${config.height}%`,
              transform: `rotate(${config.rotation}deg)`,
              zIndex: config.zIndex,
            }}
          >
            <p className="text-base md:text-xl text-rose-800 leading-relaxed">
              {guest.introduction || `我是${guest.nickname || guest.name}，很高兴认识大家！`}
            </p>
            <div className="text-center mt-4 text-rose-400 text-2xl tracking-widest">···</div>
          </div>
        );
      })()}

      {/* Side Photos - positioned by config */}
      {(() => {
        const config1 = getElement('side-photo-1');
        const config2 = getElement('side-photo-2');
        return (
          <>
            {config1?.visible && sidePhotos[0] && (
              <div 
                className="absolute rounded-full overflow-hidden border-4 border-white shadow-lg"
                style={{
                  left: `${config1.x}%`,
                  top: `${config1.y}%`,
                  width: `${config1.width}%`,
                  height: `${config1.height}%`,
                  zIndex: config1.zIndex,
                }}
              >
                <img src={sidePhotos[0]} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {config2?.visible && sidePhotos[1] && (
              <div 
                className="absolute rounded-full overflow-hidden border-4 border-white shadow-lg"
                style={{
                  left: `${config2.x}%`,
                  top: `${config2.y}%`,
                  width: `${config2.width}%`,
                  height: `${config2.height}%`,
                  zIndex: config2.zIndex,
                }}
              >
                <img src={sidePhotos[1]} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </>
        );
      })()}

      {/* Tags Row - positioned by config */}
      {(() => {
        const config = getElement('tags-row');
        if (!config?.visible) return null;
        const tags = guest.tags.filter(t => t).slice(0, 3);
        return (
          <div 
            className="absolute flex justify-center gap-3"
            style={{
              left: `${config.x}%`,
              top: `${config.y}%`,
              width: `${config.width}%`,
              height: `${config.height}%`,
              zIndex: config.zIndex,
            }}
          >
            {tags.map((tag, index) => (
              <div 
                key={index}
                className="px-4 md:px-6 py-2 bg-pink-100 border-2 border-pink-300 rounded-xl text-rose-700 font-medium text-sm shadow-md"
              >
                {tag}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Guest Number Badge - positioned by config */}
      {(() => {
        const config = getElement('guest-badge');
        if (!config?.visible) return null;
        return (
          <div 
            className="absolute flex items-center justify-center"
            style={{
              left: `${config.x}%`,
              top: `${config.y}%`,
              width: `${config.width}%`,
              height: `${config.height}%`,
              transform: `rotate(${config.rotation}deg)`,
              zIndex: config.zIndex,
            }}
          >
            <span className="inline-block bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xl md:text-2xl font-bold px-6 py-2 rounded-lg shadow-lg">
              {guest.id}号女嘉宾
            </span>
          </div>
        );
      })()}

      {/* Logo in bottom right (fixed) */}
      <div className="absolute bottom-4 right-6 flex items-center gap-2 opacity-80 z-50">
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
      <div className="absolute top-12 left-6 text-3xl animate-pulse opacity-40 z-20">💕</div>
      <div className="absolute bottom-1/4 left-10 text-2xl animate-pulse opacity-30 z-20" style={{ animationDelay: '0.5s' }}>💗</div>
      <div className="absolute top-1/4 right-6 text-4xl animate-pulse opacity-30 z-20" style={{ animationDelay: '1s' }}>💖</div>
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

// Question Bubble - displays male guest's question during "您的需求是？" phase
function QuestionBubble({ question, guestName }: { question: string; guestName: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="relative animate-in fade-in zoom-in duration-500">
        {/* Bubble */}
        <div className="bg-gradient-to-br from-blue-500/90 to-purple-600/90 backdrop-blur-md rounded-3xl px-12 py-8 max-w-2xl shadow-2xl shadow-purple-500/30 border border-white/20">
          {/* Quote marks */}
          <span className="absolute -top-4 -left-2 text-6xl text-white/30 font-serif">"</span>
          <span className="absolute -bottom-8 -right-2 text-6xl text-white/30 font-serif">"</span>
          
          {/* Question text */}
          <p className="text-3xl md:text-4xl font-bold text-white text-center leading-relaxed">
            {question}
          </p>
          
          {/* Guest name */}
          <p className="text-center mt-4 text-blue-200 text-lg">
            —— {guestName}
          </p>
        </div>
        
        {/* Bubble tail */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[20px] border-t-purple-600/90"></div>
        </div>
      </div>
    </div>
  );
}

// Heart Reveal Animation - With entrance animation + original reliable spinning logic
function HeartRevealAnimation({ 
  heartChoice, 
  femaleGuests,
  lights 
}: { 
  heartChoice: number;
  femaleGuests: FemaleGuest[];
  lights: Record<number, LightStatus>;
}) {
  // Animation phases: entering -> spinning -> slowing -> stopped -> reveal
  const [animationPhase, setAnimationPhase] = useState<'entering' | 'spinning' | 'slowing' | 'stopped' | 'reveal'>('entering');
  const [currentHighlight, setCurrentHighlight] = useState(1);
  const [showFinalCard, setShowFinalCard] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(0);
  const [formCircle, setFormCircle] = useState(false);
  
  // All 12 guest IDs for spinning (show all, including lights off)
  const allGuestIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  
  // Circle position calculator (vmin-based for true circle)
  // Shows all 12 guests in a circle
  const getCirclePosition = useCallback((guestId: number) => {
    const index = guestId - 1; // Guest IDs are 1-12, convert to 0-11
    const angle = (index / 12) * 2 * Math.PI - Math.PI / 2; // Start from top
    
    // Use vmin-based radius for true circle
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const vmin = Math.min(vw, vh);
    const radiusPx = vmin * 0.35; // 35% of smaller dimension
    
    return {
      x: 50 + (Math.cos(angle) * radiusPx / vw) * 100,
      y: 50 + (Math.sin(angle) * radiusPx / vh) * 100,
    };
  }, []);
  
  // Combined entrance + spinning animation in one effect
  useEffect(() => {
    const allTimeouts: ReturnType<typeof setTimeout>[] = [];
    const allIntervals: ReturnType<typeof setInterval>[] = [];
    
    // === ENTRANCE PHASE (0-2.5s) ===
    allTimeouts.push(setTimeout(() => setBgOpacity(0.3), 100));
    allTimeouts.push(setTimeout(() => setBgOpacity(0.6), 400));
    allTimeouts.push(setTimeout(() => setBgOpacity(0.9), 800));
    allTimeouts.push(setTimeout(() => setBgOpacity(1), 1200));
    allTimeouts.push(setTimeout(() => setFormCircle(true), 500));
    
    // === SPINNING PHASE (starts at 2.5s) ===
    const ENTRANCE_DELAY = 2500;
    
    // Spin through all 12 guests (1-12)
    const nextGuest = (current: number) => (current % 12) + 1;
    
    // Start spinning after entrance
    allTimeouts.push(setTimeout(() => {
      setAnimationPhase('spinning');
      
      // Phase 1: Fast spinning - 80ms intervals (2s)
      const fastInterval = setInterval(() => {
        setCurrentHighlight(prev => nextGuest(prev));
      }, 80);
      allIntervals.push(fastInterval);
      
      // Phase 2: Medium speed - 150ms intervals (1s)
      allTimeouts.push(setTimeout(() => {
        clearInterval(fastInterval);
        setAnimationPhase('slowing');
        
        const mediumInterval = setInterval(() => {
          setCurrentHighlight(prev => nextGuest(prev));
        }, 150);
        allIntervals.push(mediumInterval);
        
        // Phase 3: Slow - 300ms intervals (1s)
        allTimeouts.push(setTimeout(() => {
          clearInterval(mediumInterval);
          
          const slowInterval = setInterval(() => {
            setCurrentHighlight(prev => nextGuest(prev));
          }, 300);
          allIntervals.push(slowInterval);
          
          // Phase 4: Final approach - land on target
          allTimeouts.push(setTimeout(() => {
            clearInterval(slowInterval);
            
            // Take a few more dramatic slow steps, then land on target
            let finalSteps = 0;
            const targetSteps = 3 + Math.floor(Math.random() * 3); // 3-5 more steps
            
            const finalInterval = setInterval(() => {
              finalSteps++;
              
              if (finalSteps < targetSteps) {
                // Keep spinning
                setCurrentHighlight(prev => nextGuest(prev));
              } else {
                // STOP exactly on heartChoice
                clearInterval(finalInterval);
                setCurrentHighlight(heartChoice);
                setAnimationPhase('stopped');
                
                // Reveal after pause
                allTimeouts.push(setTimeout(() => {
                  setAnimationPhase('reveal');
                  setShowFinalCard(true);
                }, 800));
              }
            }, 500);
            allIntervals.push(finalInterval);
          }, 1000));
        }, 1000));
      }, 2000));
    }, ENTRANCE_DELAY));
    
    return () => {
      allTimeouts.forEach(t => clearTimeout(t));
      allIntervals.forEach(i => clearInterval(i));
    };
  }, [heartChoice]);
  
  const heartGuest = femaleGuests.find(g => g.id === heartChoice);
  const photos = heartGuest ? getGuestPhotos(heartGuest) : [];
  const isSpinning = animationPhase === 'spinning' || animationPhase === 'slowing';
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-all duration-700"
      style={{
        background: `linear-gradient(to bottom right, 
          rgba(136, 19, 55, ${bgOpacity * 0.95}), 
          rgba(157, 23, 77, ${bgOpacity * 0.95}), 
          rgba(88, 28, 135, ${bgOpacity * 0.95}))`,
        backdropFilter: bgOpacity > 0.5 ? 'blur(4px)' : 'none',
      }}
    >
      {/* Animated background hearts - deterministic positions to avoid hydration error */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000"
        style={{ opacity: bgOpacity * 0.3 }}
      >
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl animate-pulse"
            style={{
              left: `${(i * 17 + 5) % 100}%`,
              top: `${(i * 23 + 10) % 100}%`,
              animationDelay: `${(i % 4) * 0.5}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}
          >
            💕
          </div>
        ))}
      </div>
      
      {/* Title - fade in */}
      <div 
        className="absolute top-8 left-0 right-0 text-center transition-all duration-700"
        style={{ 
          opacity: bgOpacity,
          transform: `translateY(${(1 - bgOpacity) * -20}px)`,
        }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          💕 心动女生揭晓 💕
        </h1>
        <p className="text-rose-300 text-lg">
          {animationPhase === 'entering' ? '准备揭晓...' : 
           animationPhase === 'reveal' ? '心动女生是...' : 
           '谁是他的心动女生？'}
        </p>
      </div>
      
      {/* Candidates - animate to circle formation */}
      {!showFinalCard && (
        <div className="absolute inset-0">
          {/* All 12 guests - eligible ones animate to circle */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((guestId) => {
            const guest = femaleGuests.find(g => g.id === guestId);
            const isEligible = lights[guestId] !== 'off';
            const circlePos = getCirclePosition(guestId);
            const guestPhotos = guest ? getGuestPhotos(guest) : [];
            const isHighlighted = isSpinning && currentHighlight === guestId;
            const isStopped = animationPhase === 'stopped' && currentHighlight === guestId;
            const isLightOn = isEligible; // Show light status
            
            const scale = (isHighlighted || isStopped) ? 1.3 : 1;
            // Dimmed for lights off, brighter for lights on
            const baseOpacity = isLightOn ? 1 : 0.5;
            const opacity = (isHighlighted || isStopped) ? 1 : isSpinning ? 0.6 * baseOpacity : baseOpacity;
            
            // Start from grid position, animate to circle (ALL guests)
            const startRow = guestId <= 6 ? 30 : 60;
            const startCol = ((guestId - 1) % 6) * 14 + 15;
            const currentX = formCircle ? circlePos.x : startCol;
            const currentY = formCircle ? circlePos.y : startRow;
            
            return (
              <div
                key={guestId}
                className="absolute transition-all"
                style={{
                  left: `${currentX}%`,
                  top: `${currentY}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity: formCircle ? opacity : bgOpacity,
                  transitionDuration: formCircle ? '1500ms' : '300ms',
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: (isHighlighted || isStopped) ? 30 : 10,
                }}
              >
                <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-4 transition-all duration-300 ${
                  (isHighlighted || isStopped)
                    ? 'border-rose-400 shadow-[0_0_40px_rgba(251,113,133,0.9)]' 
                    : isLightOn 
                      ? 'border-white/50 shadow-lg' 
                      : 'border-gray-500/50 shadow-md grayscale'
                }`}>
                  {guestPhotos[0] ? (
                    <img 
                      src={guestPhotos[0]} 
                      alt={guest?.name || `${guestId}`}
                      className={`w-full h-full object-cover ${!isLightOn && !isHighlighted && !isStopped ? 'grayscale' : ''}`}
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-xl font-bold text-white ${
                      isLightOn ? 'bg-gradient-to-br from-pink-400 to-rose-500' : 'bg-gray-600'
                    }`}>
                      {guestId}
                    </div>
                  )}
                </div>
                
                {/* Name label */}
                {(isHighlighted || isStopped) && guest && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap animate-in fade-in zoom-in duration-200">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-lg ${
                      isLightOn ? 'bg-rose-500 text-white' : 'bg-gray-600 text-gray-200'
                    }`}>
                      {guest.nickname || guest.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Center heart indicator */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
            style={{
              opacity: formCircle ? 1 : 0,
              transform: `translate(-50%, -50%) scale(${formCircle ? 1 : 0.5})`,
            }}
          >
            <div className={`text-6xl md:text-8xl transition-all ${
              animationPhase === 'stopped' ? 'animate-bounce' : 
              animationPhase === 'entering' ? '' : 'animate-pulse'
            }`}>
              💖
            </div>
          </div>
        </div>
      )}
      
      {/* Final reveal card */}
      {showFinalCard && heartGuest && (
        <div className="animate-in zoom-in fade-in duration-700 text-center">
          {/* Large photo */}
          <div className="relative inline-block mb-6">
            <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-8 border-rose-400 shadow-[0_0_60px_rgba(251,113,133,0.6)] mx-auto">
              {photos[0] ? (
                <img 
                  src={photos[0]} 
                  alt={heartGuest.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-6xl font-bold text-white">
                  {heartGuest.id}
                </div>
              )}
            </div>
            {/* Floating hearts around photo */}
            <div className="absolute -top-4 -left-4 text-4xl animate-bounce">💕</div>
            <div className="absolute -top-4 -right-4 text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>💗</div>
            <div className="absolute -bottom-4 -left-4 text-4xl animate-bounce" style={{ animationDelay: '0.4s' }}>💖</div>
            <div className="absolute -bottom-4 -right-4 text-4xl animate-bounce" style={{ animationDelay: '0.6s' }}>❤️</div>
          </div>
          
          {/* Name and info */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl px-12 py-8 max-w-lg mx-auto">
            <div className="text-rose-300 text-xl mb-2">心动女生是</div>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {heartGuest.nickname || heartGuest.name}
            </h2>
            <div className="text-2xl text-rose-200">
              {heartGuest.id}号女嘉宾
            </div>
            {heartGuest.school && (
              <div className="text-lg text-rose-300/80 mt-2">
                {heartGuest.school}
              </div>
            )}
          </div>
          
          {/* Celebration text */}
          <div className="mt-8 text-2xl text-rose-200 animate-pulse">
            ✨ 心动的感觉，就是这样 ✨
          </div>
        </div>
      )}
    </div>
  );
}

// Google Slides Overlay for female guest intro - Native embed (fullscreen 16:9)
// slideIndex: 0-based slide index to display
// For new structure: each guest has 4 slides (intro + 3 tags)
// Guest N intro: (N-1)*4, Guest N tag i: (N-1)*4 + i + 1
function GoogleSlidesOverlay({ 
  slideIndex, 
  presentationId,
  onClose 
}: { 
  slideIndex: number; 
  presentationId: string;
  onClose?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate scale to fill viewport while maintaining 16:9
  useEffect(() => {
    const calculateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const slideAspect = 16 / 9;
      const viewportAspect = vw / vh;
      
      // Scale to cover the viewport (like object-fit: cover)
      if (viewportAspect > slideAspect) {
        // Viewport is wider than slide - scale based on width
        setScale(vw / (vh * slideAspect));
      } else {
        // Viewport is taller than slide - scale based on height
        setScale((vh * slideAspect) / vw);
      }
    };
    
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);
  
  // Google Slides embed URL - directly embeds the presentation
  // rm=minimal removes chrome, slide parameter goes to specific slide (0-based)
  const embedUrl = `https://docs.google.com/presentation/d/${presentationId}/embed?rm=minimal&start=false&loop=false&slide=${slideIndex}`;
  
  return (
    <div ref={containerRef} className="fixed inset-0 z-50 overflow-hidden bg-black">
      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gradient-to-br from-pink-100 via-rose-50 to-pink-100">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-400 border-t-transparent" />
            <div className="text-rose-600 text-lg">加载幻灯片中...</div>
          </div>
        </div>
      )}
      
      {/* Scaled iframe container - fills viewport */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* 16:9 aspect ratio container */}
        <div 
          className="relative"
          style={{
            width: '100vw',
            height: `${100 / (16/9)}vw`, // Height based on 16:9 ratio
            maxHeight: '100vh',
            maxWidth: `${100 * (16/9)}vh`, // Width based on 16:9 ratio
          }}
        >
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
      
      {/* Close button (if onClose provided) */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-60 bg-black/50 hover:bg-black/70 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Helper to calculate slide index for a guest (1-indexed for Google Slides)
// Each guest has 4 slides: intro + 3 tags
// Guest 1: slides 1-4, Guest 2: slides 5-8, etc.
function getGuestSlideIndex(guestId: number, tagIndex?: number): number {
  // Base index: Guest 1 starts at slide 1, Guest 2 at slide 5, etc.
  const baseIndex = (guestId - 1) * 4 + 1;
  if (tagIndex === undefined) {
    return baseIndex; // Intro slide
  }
  return baseIndex + tagIndex + 1; // Tag slide (tagIndex is 0-indexed)
}

export default function StagePage() {
  // Stage is READ-ONLY - no updateState needed, all control from Director panel
  const { state, femaleGuests, maleGuests, slides, connected, error } = useEventStream();
  const { play } = useSound();
  const [time, setTime] = useState(new Date());
  const [showRoundInfo, setShowRoundInfo] = useState(true);
  const prevLightsRef = useRef<Record<number, LightStatus>>({});
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>(defaultTemplateConfig);
  const [googleSlidesId, setGoogleSlidesId] = useState<string | null>(null);
  const [customSlidesId, setCustomSlidesId] = useState<string | null>(null);
  // Track which tag slide is being shown (null = none, 0-2 = tag index)
  const [showingTagSlide, setShowingTagSlide] = useState<number | null>(null);

  // Load template config
  useEffect(() => {
    fetch('/api/template-config')
      .then(res => res.json())
      .then(data => {
        if (data.elements) {
          setTemplateConfig(data);
        }
      })
      .catch(err => console.error('Failed to load template config:', err));
  }, []);

  // Load Google Slides config (for female guest intro)
  useEffect(() => {
    fetch('/api/google-slides')
      .then(res => res.json())
      .then(data => {
        if (data.configured && data.presentationId) {
          setGoogleSlidesId(data.presentationId);
        }
      })
      .catch(err => console.error('Failed to load Google Slides config:', err));
  }, []);

  // Load custom slides Google Slides config (separate from female guest intro)
  useEffect(() => {
    fetch('/api/custom-slides-config')
      .then(res => res.json())
      .then(data => {
        if (data.configured && data.presentationId) {
          setCustomSlidesId(data.presentationId);
        }
      })
      .catch(err => console.error('Failed to load custom slides config:', err));
  }, []);

  // Clear tag slide when profile changes
  useEffect(() => {
    setShowingTagSlide(null);
  }, [state.showingProfile]);

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
      {/* Uses separate Google Slides config from female guest intro */}
      {currentSlide?.googleSlideIndex && customSlidesId ? (
        <GoogleSlidesOverlay 
          slideIndex={currentSlide.googleSlideIndex} 
          presentationId={customSlidesId} 
        />
      ) : currentSlide?.imageUrl ? (
        <SlideOverlay imageUrl={currentSlide.imageUrl} slideName={currentSlide.name} blur={blurValue} />
      ) : null}

      {/* VCR Overlay - READ-ONLY, controlled from Director panel */}
      <VCRPlayer 
        url={vcrUrl} 
        playing={state.vcrPlaying} 
        lights={state.lights}
        introUrl={state.vcrType === 'vcr1' ? state.vcr1IntroUrl : state.vcr2IntroUrl}
        playingIntro={state.vcrPlayingIntro}
      />

      {/* Question Bubble - shows during "您的需求是？" phase */}
      {state.phase === 'male_question' && currentMale && (
        <QuestionBubble 
          question={currentMale.question || '请问你对另一半有什么期待？'} 
          guestName={currentMale.nickname || currentMale.name} 
        />
      )}

      {/* Heart Reveal Animation - shows during "心动女生揭晓" phase */}
      {state.phase === 'heart_reveal' && state.heartChoices?.[state.currentMaleGuest] && (
        <HeartRevealAnimation
          heartChoice={state.heartChoices[state.currentMaleGuest]!}
          femaleGuests={femaleGuests}
          lights={state.lights}
        />
      )}

      {/* Fullscreen Female Introduction - Google Slides or Template */}
      {state.currentFemaleIntro && state.useGoogleSlides && googleSlidesId ? (
        <GoogleSlidesOverlay slideIndex={getGuestSlideIndex(state.currentFemaleIntro)} presentationId={googleSlidesId} />
      ) : currentFemaleForIntro ? (
        <FemaleGuestFullscreen guest={currentFemaleForIntro} templateConfig={templateConfig} />
      ) : null}

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


        {/* Female Guests Lights - Two rows of 6, enlarged +60% total */}
        <div className="w-full mx-auto mb-8 mt-4 md:mt-8 px-4">
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

        {/* Male Guest Card (when relevant) - no introduction shown on stage */}
        {/* Note: male_question phase uses top bar instead */}
        {['male_enter', 'talent', 'final_choice'].includes(state.phase) && currentMale && (
          <div className="mt-8">
            <MaleGuestCard
              name={currentMale.nickname || currentMale.name}
              photo={currentMale.photo}
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
                    
                    {/* Clickable Tags - click to show Google Slide */}
                    <div className="space-y-3">
                      {guest.tags.map((tag, index) => (
                        <button 
                          key={index}
                          onClick={() => {
                            if (googleSlidesId) {
                              setShowingTagSlide(index);
                            }
                          }}
                          disabled={!googleSlidesId}
                          className={`w-full text-left p-4 rounded-xl transition-all ${
                            state.showingTag === null || state.showingTag === index
                              ? 'bg-white/20 hover:bg-white/30'
                              : 'bg-white/5 opacity-50'
                          } ${googleSlidesId ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-pink-300 mb-1">标签 {index + 1}</div>
                              <div className={`font-medium ${
                                state.showingTag === null || state.showingTag === index
                                  ? 'text-white'
                                  : 'text-gray-400 blur-sm'
                              }`}>
                                {tag}
                              </div>
                            </div>
                            {googleSlidesId && (
                              <span className="text-pink-400 text-xl">▶</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Tag Slide Overlay - shows when a tag is clicked */}
        {state.showingProfile && showingTagSlide !== null && googleSlidesId && (
          <GoogleSlidesOverlay 
            slideIndex={getGuestSlideIndex(state.showingProfile, showingTagSlide)} 
            presentationId={googleSlidesId}
            onClose={() => setShowingTagSlide(null)}
          />
        )}

        {/* Male Guest Question Full Page - displayed during male_question phase */}
        {state.phase === 'male_question' && currentMale && (
          <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 flex items-center justify-center">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-500/10 rounded-full blur-3xl" />
            </div>
            
            {/* Content */}
            <div className="relative z-10 text-center max-w-4xl mx-auto px-8">
              {/* Photo */}
              <div className="mb-8">
                {currentMale.photo ? (
                  <img 
                    src={currentMale.photo} 
                    alt={currentMale.name} 
                    className="w-40 h-40 md:w-52 md:h-52 rounded-full object-cover mx-auto border-4 border-blue-400 shadow-2xl shadow-blue-500/30"
                  />
                ) : (
                  <div className="w-40 h-40 md:w-52 md:h-52 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-6xl mx-auto border-4 border-blue-400 shadow-2xl shadow-blue-500/30">
                    👤
                  </div>
                )}
              </div>
              
              {/* Name */}
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                {currentMale.nickname || currentMale.name}
              </h2>
              
              {/* Question label */}
              <p className="text-blue-300 text-xl md:text-2xl mb-4 tracking-wider">
                💭 我的问题
              </p>
              
              {/* Question text */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-8 py-6 md:px-12 md:py-8 border border-white/20">
                <p className="text-white text-2xl md:text-4xl font-bold leading-relaxed">
                  {currentMale.question || '...'}
                </p>
              </div>
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
