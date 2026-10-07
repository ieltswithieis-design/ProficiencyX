/**
 * Centralized Audio & Media Lifecycle Manager
 * Ensures that any speech synthesis, audio playback, or media streams
 * are completely silenced and stopped whenever the user moves between
 * tests, sections, or pages.
 */

import { stopAllSpeech } from "./speechVoice";

const stopListeners = new Set<() => void>();

export function registerMediaStopHandler(handler: () => void): () => void {
  stopListeners.add(handler);
  return () => {
    stopListeners.delete(handler);
  };
}

export function stopAllActiveMedia(): void {
  // 1. Stop shared speechVoice audio element & active utterances
  try {
    stopAllSpeech();
  } catch {}

  // 2. Invoke all registered component media stop handlers (ListeningAudioPlayer, AutonomousExaminerRoom, etc.)
  stopListeners.forEach((handler) => {
    try {
      handler();
    } catch {}
  });

  // 3. Cancel browser SpeechSynthesis TTS unconditionally
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("Error cancelling speech synthesis:", e);
    }
  }

  // 4. Pause and reset all HTMLAudioElement and HTMLVideoElement instances in the DOM
  if (typeof document !== "undefined") {
    try {
      const mediaElements = document.querySelectorAll<HTMLMediaElement>("audio, video");
      mediaElements.forEach(el => {
        try {
          el.onended = null;
          el.onerror = null;
          el.pause();
          el.currentTime = 0;
        } catch {}
      });
    } catch {}
  }
}

export function getSupportedAudioMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/wav",
  ];
  for (const type of candidates) {
    try {
      if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {}
  }
  return "";
}

export function createSafeMediaRecorder(stream: MediaStream): { recorder: MediaRecorder; mimeType: string } {
  const supported = getSupportedAudioMimeType();
  if (supported) {
    try {
      const recorder = new MediaRecorder(stream, { mimeType: supported });
      return { recorder, mimeType: supported.split(";")[0] || "audio/webm" };
    } catch {}
  }
  const recorder = new MediaRecorder(stream);
  return { recorder, mimeType: (recorder.mimeType || "audio/webm").split(";")[0] || "audio/webm" };
}
