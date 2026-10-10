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
    const load = (src: string) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = 0.5;
      audio.load();
      return audio;
    };
    sounds = { success: load("/audio/success.mp3"), fail: load("/audio/fail.mp3") };
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
