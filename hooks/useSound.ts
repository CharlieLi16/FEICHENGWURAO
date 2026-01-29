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

  const play = useCallback((soundName: SoundName, volume: number = 1) => {
    const path = SOUNDS[soundName];
    
    try {
      // Reuse existing audio element or create new one
      let audio = audioRefs.current.get(path);
      if (!audio) {
        audio = new Audio(path);
        audioRefs.current.set(path, audio);
      }
      
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.currentTime = 0;
      audio.play().catch((e) => {
        // Silently fail if audio can't play (e.g., file not found)
        console.log(`Sound not available: ${soundName}`, e);
      });
    } catch (e) {
      console.log(`Error playing sound: ${soundName}`, e);
    }
  }, []);

  const playUrl = useCallback((url: string, volume: number = 1) => {
    try {
      const audio = new Audio(url);
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.play().catch((e) => {
        console.log(`Sound not available: ${url}`, e);
      });
    } catch (e) {
      console.log(`Error playing sound: ${url}`, e);
    }
  }, []);

  return { play, playUrl, SOUNDS };
}
