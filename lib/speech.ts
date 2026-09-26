"use client";

import { useCallback, useEffect, useState } from "react";

// Maps this app's plain language codes (as stored on `courses`) to the
// BCP-47 tags the browser's SpeechSynthesis API expects.
const SPEECH_LANG: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  yue: "zh-HK",
};

export function speechLang(languageCode: string): string {
  return SPEECH_LANG[languageCode] ?? languageCode;
}

// Voices worth using, best first, matched by name prefix. Without an explicit
// pick the browser takes the first voice for the language, which on macOS is
// often one of Apple's novelty voices (Eddy, Grandpa, Rocko…) — they sort
// ahead of the real ones and sound odd.
const PREFERRED_VOICES: Record<string, string[]> = {
  "ja-JP": [
    "Google 日本語",
    "Kyoko",
    "O-Ren",
    "Otoya",
    "Hattori",
    "Microsoft Nanami",
    "Microsoft Ayumi",
    "Microsoft Haruka",
  ],
  "zh-HK": ["Google 粤語", "Sinji", "Microsoft HiuMaan", "Microsoft Tracy"],
  "en-US": ["Google US English", "Samantha", "Microsoft Aria", "Microsoft Zira"],
};

const NOVELTY_VOICES = [
  "Eddy",
  "Flo",
  "Grandma",
  "Grandpa",
  "Reed",
  "Rocko",
  "Sandy",
  "Shelley",
];

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.replace("_", "-") === lang);

  // Apple's "(Enhanced)"/"(Premium)" downloads beat the compact defaults.
  const quality = (voice: SpeechSynthesisVoice) =>
    /premium/i.test(voice.name) ? 0 : /enhanced/i.test(voice.name) ? 1 : 2;

  for (const name of PREFERRED_VOICES[lang] ?? []) {
    const matches = voices
      .filter((voice) => voice.name.startsWith(name))
      .sort((a, b) => quality(a) - quality(b));
    if (matches.length > 0) return matches[0];
  }

  return (
    voices.find(
      (voice) => !NOVELTY_VOICES.some((name) => voice.name.startsWith(name)),
    ) ?? null
  );
}

// Thin wrapper around the browser's native SpeechSynthesis API — no
// third-party dependency needed for this.
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);

  // Chrome loads voices lazily on the first getVoices() call; kick that off
  // on mount so the list is ready by the time someone taps Listen.
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  const speak = useCallback((text: string, languageCode: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang(languageCode);
    // getVoices() can be empty until the browser finishes loading them; the
    // utterance then just falls back to the browser default for `lang`.
    const voice = pickVoice(utterance.lang);
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak, speaking };
}
