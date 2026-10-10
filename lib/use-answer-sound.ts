"use client";

import { useEffect } from "react";

// A quick chime for each answer in a test or review: success.mp3 when it's
// right, fail.mp3 when it's wrong. Like Charles's quack in the daily
// challenge — loaded up front so the first one doesn't wait on the file,
// rewound so quick answers each get their own, and a blocked play ignored.
// Kept at module level, so they're loaded once and shared by every session.
let sounds: { success: HTMLAudioElement; fail: HTMLAudioElement } | null = null;

function loadSounds() {
  if (!sounds) {
    const load = (src: string, volume: number) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = volume;
      audio.load();
      return audio;
    };
    // fail.mp3 is recorded far louder (about 11 dB at its peak, 15 dB on
    // average), so it plays at around a quarter of success's volume to
    // sound as loud.
    sounds = { success: load("/audio/success.mp3", 0.5), fail: load("/audio/fail.mp3", 0.12) };
  }
  return sounds;
}

function playAnswerSound(correct: boolean) {
  const audio = correct ? loadSounds().success : loadSounds().fail;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// Loads the sounds as the session opens, and returns the player.
export function useAnswerSound() {
  useEffect(() => {
    loadSounds();
  }, []);
  return playAnswerSound;
}
