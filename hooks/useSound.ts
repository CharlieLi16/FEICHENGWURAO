'use client';

import { useCallback, useRef } from 'react';

// Sound file paths
export const SOUNDS = {
  lightOn: '/assets/sounds/light-on.mp3',
  lightOff: '/assets/sounds/light-off.mp3',
  burst: '/assets/sounds/burst.mp3',
  maleEnter: '/assets/sounds/male-enter.mp3',
  success: '/assets/sounds/success.mp3',
  fail: '/assets/sounds/fail.mp3',
  vcrStart: '/assets/sounds/vcr-start.mp3',
  roundStart: '/assets/sounds/round-start.mp3',
  countdown: '/assets/sounds/countdown.mp3',
  applause: '/assets/sounds/applause.mp3',
} as const;

export type SoundName = keyof typeof SOUNDS;

export function useSound() {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentVolume = useRef<number>(1);

  // Update volume for ALL audio elements (including currently playing)
  const setMasterVolume = useCallback((volume: number) => {
    const vol = Math.min(1, Math.max(0, volume));
    currentVolume.current = vol;
    
    // Update all existing audio elements
    audioRefs.current.forEach((audio) => {
      audio.volume = vol;
    });
  }, []);

  const play = useCallback((soundName: SoundName, volume?: number) => {
    const path = SOUNDS[soundName];
    const vol = volume !== undefined ? volume : currentVolume.current;
    
    try {
      // Reuse existing audio element or create new one
      let audio = audioRefs.current.get(path);
      if (!audio) {
        audio = new Audio(path);
        audioRefs.current.set(path, audio);
      }
      
      audio.volume = Math.min(1, Math.max(0, vol));
      audio.currentTime = 0;
      audio.play().catch((e) => {
        // Silently fail if audio can't play (e.g., file not found)
        console.log(`Sound not available: ${soundName}`, e);
      });
    } catch (e) {
      console.log(`Error playing sound: ${soundName}`, e);
    }
  }, []);

  const playUrl = useCallback((url: string, volume?: number) => {
    const vol = volume !== undefined ? volume : currentVolume.current;
    try {
      const audio = new Audio(url);
      audio.volume = Math.min(1, Math.max(0, vol));
      audio.play().catch((e) => {
        console.log(`Sound not available: ${url}`, e);
      });
    } catch (e) {
      console.log(`Error playing sound: ${url}`, e);
    }
  }, []);

  const getMasterVolume = useCallback(() => currentVolume.current, []);

  // Stop a specific sound
  const stop = useCallback((soundName: SoundName) => {
    const path = SOUNDS[soundName];
    const audio = audioRefs.current.get(path);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  // Stop all sounds
  const stopAll = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  // Pause a specific sound (can resume later)
  const pause = useCallback((soundName: SoundName) => {
    const path = SOUNDS[soundName];
    const audio = audioRefs.current.get(path);
    if (audio) {
      audio.pause();
    }
  }, []);

  // Resume a paused sound
  const resume = useCallback((soundName: SoundName) => {
    const path = SOUNDS[soundName];
    const audio = audioRefs.current.get(path);
    if (audio) {
      audio.play().catch((e) => {
        console.log(`Cannot resume sound: ${soundName}`, e);
      });
    }
  }, []);

  // Check if a sound is currently playing
  const isPlaying = useCallback((soundName: SoundName) => {
    const path = SOUNDS[soundName];
    const audio = audioRefs.current.get(path);
    return audio ? !audio.paused && !audio.ended : false;
  }, []);

  return { 
    play, 
    playUrl, 
    setMasterVolume, 
    getMasterVolume, 
    stop,
    stopAll,
    pause,
    resume,
    isPlaying,
    SOUNDS 
  };
}
