import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  SkipBack, 
  SkipForward, 
  MessageSquare, 
  Users, 
  User, 
  Timer, 
  ArrowRight, 
  Headphones, 
  FileText, 
  Radio,
  Video,
  Activity,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  parseScriptToDialogue, 
  getVoicesForDialogue, 
  applyVoiceToUtterance, 
  ParsedPartScript, 
} from "../utils/listeningDialogue";
import { useLanguage } from "../context/LanguageContext";
import { translateTextToLanguage } from "../utils/universalTranslator";

interface ListeningAudioPlayerProps {
  script: string;
  partNumber: number;
  partTitle?: string;
  playbackRate: number;
  onRateChange: (rate: number) => void;
  onScrollToQuestions?: () => void;
}

export const ListeningAudioPlayer: React.FC<ListeningAudioPlayerProps> = ({
  script,
  partNumber,
  partTitle,
  playbackRate,
  onRateChange,
  onScrollToQuestions,
}) => {
  const { currentLanguage, currentLanguageInfo } = useLanguage();
  const localize = (text: string): string => {
    if (!text || currentLanguage === "en") return text;
    return translateTextToLanguage(text, currentLanguage);
  };
  const testContent = (text: string): string => text;
  const [parsedData, setParsedData] = useState<ParsedPartScript>(() => 
    parseScriptToDialogue(script, partNumber)
  );
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isReadingPause, setIsReadingPause] = useState<boolean>(false);
  const [pauseCountdown, setPauseCountdown] = useState<number>(15);
  const [viewMode, setViewMode] = useState<"hologram" | "conversation" | "classic">("hologram");
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [voices, setVoices] = useState(() => getVoicesForDialogue("en-US", "en"));
  const [spokenCharProgress, setSpokenCharProgress] = useState<number>(0);

  useEffect(() => {
    const updateVoices = () => {
      setVoices(getVoicesForDialogue("en-US", "en"));
    };
    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.onvoiceschanged === updateVoices) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      }
    };
  }, [currentLanguage, currentLanguageInfo.locale]);

  const playSessionIdRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const pauseIntervalRef = useRef<any>(null);
  const playDelayTimeoutRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const conversationScrollRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    if (pauseIntervalRef.current) {
      clearInterval(pauseIntervalRef.current);
      pauseIntervalRef.current = null;
    }
    if (playDelayTimeoutRef.current) {
      clearTimeout(playDelayTimeoutRef.current);
      playDelayTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const getOrCreateAudio = (): HTMLAudioElement => {
    if (!activeAudioRef.current) {
      const a = new Audio();
      a.preload = "auto";
      activeAudioRef.current = a;
    }
    return activeAudioRef.current;
  };

  const prewarmTurnAudio = (turnIdx: number, turnsList = parsedData.turns) => {
    if (turnIdx < 0 || turnIdx >= turnsList.length) return;
    const target = turnsList[turnIdx];
    if (!target || target.type === "pause" || !target.text) return;
    const gender = target.gender === "male" ? "male" : target.gender === "narrator" ? "narrator" : "female";
    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: target.text,
        lang: "en",
        gender,
      }),
    }).catch(() => {});
  };

  const stopPlayback = () => {
    playSessionIdRef.current++;
    isPlayingRef.current = false;
    clearTimers();
    setIsReadingPause(false);
    setIsPlaying(false);
    setSpokenCharProgress(0);

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.onended = null;
        activeAudioRef.current.onerror = null;
        activeAudioRef.current.ontimeupdate = null;
        activeAudioRef.current.pause();
      } catch {}
    }

    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
      currentUtteranceRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    }
  };

  useEffect(() => {
    stopPlayback();
    const parsed = parseScriptToDialogue(script, partNumber);
    setParsedData(parsed);
    setCurrentTurnIndex(0);
    setIsReadingPause(false);
    // Pre-warm first 3 turns in background so first click plays with 0ms latency
    for (let i = 0; i < Math.min(4, parsed.turns.length); i++) {
      prewarmTurnAudio(i, parsed.turns);
    }
  }, [script, partNumber]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  useEffect(() => {
    if ((viewMode === "conversation" || viewMode === "hologram") && conversationScrollRef.current) {
      const container = conversationScrollRef.current;
      const activeEl = document.getElementById(`dialogue-turn-${currentTurnIndex}`);
      if (container && activeEl) {
        const cTop = container.scrollTop;
        const cHeight = container.clientHeight;
        const elTop = activeEl.offsetTop - container.offsetTop;
        const elHeight = activeEl.clientHeight;

        if (elTop < cTop + 10 || elTop + elHeight > cTop + cHeight - 10) {
          container.scrollTo({
            top: Math.max(0, elTop - 18),
            behavior: "smooth",
          });
        }
      }
    }
  }, [currentTurnIndex, viewMode]);

  const startVisualProgressTicker = (textLength: number, sessionToken: number, index: number, isFallbackAutoAdvance: boolean) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setSpokenCharProgress(0);
    const wordsCount = Math.max(3, Math.ceil(textLength / 5));
    const totalMs = Math.max(2000, Math.round((wordsCount * 360) / (playbackRate || 1)));
    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      if (sessionToken !== playSessionIdRef.current || !isPlayingRef.current) {
        clearInterval(progressIntervalRef.current);
        return;
      }
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setSpokenCharProgress(pct);

      if (elapsed >= totalMs + (isFallbackAutoAdvance ? 100 : 1800)) {
        clearInterval(progressIntervalRef.current);
        if (sessionToken === playSessionIdRef.current && isPlayingRef.current) {
          if (index + 1 < parsedData.turns.length) {
            playTurn(index + 1);
          } else {
            stopPlayback();
            setCurrentTurnIndex(0);
          }
        }
      }
    }, 100);
  };

  // Play a specific turn SYNCHRONOUSLY on click with real MP3 audio stream + Web Speech fallback + Holographic Video Sync
  const playTurn = (index: number) => {
    if (index >= parsedData.turns.length) {
      stopPlayback();
      setCurrentTurnIndex(0);
      return;
    }

    clearTimers();
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.onended = null;
        activeAudioRef.current.onerror = null;
        activeAudioRef.current.ontimeupdate = null;
        activeAudioRef.current.pause();
      } catch {}
    }
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
      currentUtteranceRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    }

    const sessionToken = ++playSessionIdRef.current;
    setCurrentTurnIndex(index);
    isPlayingRef.current = true;
    setIsPlaying(true);

    // Pre-warm the next 2 turns in the background
    prewarmTurnAudio(index + 1);
    prewarmTurnAudio(index + 2);

    const turn = parsedData.turns[index];

    if (turn.type === "pause") {
      setIsReadingPause(true);
      const duration = turn.pauseDuration || 15;
      setPauseCountdown(duration);

      let timeLeft = duration;
      pauseIntervalRef.current = setInterval(() => {
        if (sessionToken !== playSessionIdRef.current) {
          clearTimers();
          return;
        }
        timeLeft -= 1;
        setPauseCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearTimers();
          setIsReadingPause(false);
          playTurn(index + 1);
        }
      }, 1000);

      return;
    }

    setIsReadingPause(false);
    const spokenText = testContent(turn.text);
    const gender = turn.gender === "male" ? "male" : turn.gender === "narrator" ? "narrator" : "female";

    // Synchronously start real MP3 stream inside the user's click handler (0ms delay, preserves user gesture activation)
    try {
      const audio = getOrCreateAudio();
      const streamUrl = `/api/tts-stream?text=${encodeURIComponent(spokenText)}&lang=en&gender=${encodeURIComponent(gender)}`;
      audio.volume = 1.0;
      audio.src = streamUrl;
      audio.playbackRate = playbackRate;

      let fallbackUsed = false;
      const runWebSpeechFallback = () => {
        if (fallbackUsed || sessionToken !== playSessionIdRef.current || !isPlayingRef.current) return;
        fallbackUsed = true;
        playWithWebSpeech(spokenText, sessionToken, index);
      };

      setSpokenCharProgress(5);

      audio.ontimeupdate = () => {
        if (sessionToken !== playSessionIdRef.current || !isPlayingRef.current) return;
        if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
          const pct = Math.min(100, Math.max(5, Math.round((audio.currentTime / audio.duration) * 100)));
          setSpokenCharProgress(pct);
        }
      };

      audio.onended = () => {
        if (sessionToken !== playSessionIdRef.current || !isPlayingRef.current) return;
        clearTimers();
        setSpokenCharProgress(100);
        if (index + 1 < parsedData.turns.length) {
          playTurn(index + 1);
        } else {
          stopPlayback();
          setCurrentTurnIndex(0);
        }
      };

      audio.onerror = () => {
        runWebSpeechFallback();
      };

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          runWebSpeechFallback();
        });
      }
      return;
    } catch {
      playWithWebSpeech(spokenText, sessionToken, index);
    }
  };

  const playWithWebSpeech = (spokenText: string, sessionToken: number, index: number) => {
    const turn = parsedData.turns[index];
    if (!turn) return;

    startVisualProgressTicker(spokenText.length, sessionToken, index, true);

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(spokenText);
      const activeDialogueVoices =
        voices.defaultVoice || voices.femaleVoice || voices.maleVoice
          ? voices
          : getVoicesForDialogue("en-US", "en");
      applyVoiceToUtterance(utterance, turn.gender, playbackRate, activeDialogueVoices, "en-US");

      utterance.onend = () => {
        if (sessionToken !== playSessionIdRef.current || !isPlayingRef.current) return;
        clearTimers();
        if (index + 1 < parsedData.turns.length) {
          playTurn(index + 1);
        } else {
          stopPlayback();
          setCurrentTurnIndex(0);
        }
      };

      utterance.onerror = (e) => {
        if (sessionToken !== playSessionIdRef.current) return;
        if (e.error === "interrupted" || e.error === "canceled") return;
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      if (isReadingPause) {
        skipReadingPause();
      } else {
        playTurn(currentTurnIndex);
      }
    }
  };

  const skipReadingPause = () => {
    clearTimers();
    setIsReadingPause(false);
    playTurn(currentTurnIndex + 1);
  };

  const handlePreviousTurn = () => {
    if (currentTurnIndex <= 0) return;
    playTurn(currentTurnIndex - 1);
  };

  const handleNextTurn = () => {
    if (currentTurnIndex >= parsedData.turns.length - 1) return;
    playTurn(currentTurnIndex + 1);
  };

  const handleJumpToTurn = (index: number) => {
    playTurn(index);
  };

  const handleRestart = () => {
    playTurn(0);
  };

  const currentTurn = parsedData.turns[currentTurnIndex];

  return (
    <div className="rounded-2xl border border-cyan-500/35 bg-[#040917]/95 p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] space-y-4">
      {audioNotice && (
        <div className="flex items-center justify-between rounded-lg bg-amber-950/60 border border-amber-500/40 p-2.5 text-xs text-amber-200 font-medium">
          <span>{audioNotice}</span>
          <button
            type="button"
            onClick={() => setAudioNotice(null)}
            className="text-amber-300 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header: Title, Active Speaker Status, and View Mode */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 px-3 py-1 text-xs font-black text-cyan-300">
              <Video className="h-3.5 w-3.5 text-cyan-400" />
              {localize(`Part ${partNumber} Holographic Video & Audio Stream`)}
            </span>

            {parsedData.isConversation ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/15 border border-violet-400/35 px-2.5 py-0.5 text-[11px] font-extrabold text-violet-300">
                <Users className="h-3 w-3 text-violet-400" />
                {localize("3D Dual-Speaker Hologram • Boy & Girl Voices")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 border border-blue-400/35 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-300">
                <Radio className="h-3 w-3 text-blue-400" />
                {localize("3D Academic Lecture Hologram")}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs font-semibold text-slate-300">
            {localize(partTitle || `IELTS Listening Part ${partNumber}`)}
            <span className="ml-1.5 text-slate-400 font-normal">
              • {localize("Click Play Video & Audio below or click any speaker line.")}
            </span>
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-cyan-500/25 bg-[#081226] p-1">
          <button
            onClick={() => setViewMode("hologram")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              viewMode === "hologram"
                ? "bg-cyan-500 text-slate-950 font-black"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>{localize("3D Video Stage")}</span>
          </button>
          <button
            onClick={() => setViewMode("conversation")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              viewMode === "conversation"
                ? "bg-cyan-500 text-slate-950 font-black"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{localize("Dialogue")}</span>
          </button>
          <button
            onClick={() => setViewMode("classic")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              viewMode === "classic"
                ? "bg-cyan-500 text-slate-950 font-black"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{localize("Full Script")}</span>
          </button>
        </div>
      </div>

      {/* Main Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#071124] p-3.5 border border-cyan-500/25">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePreviousTurn}
            disabled={currentTurnIndex <= 0}
            className="flex h-11 items-center gap-1.5 px-3 rounded-xl border border-cyan-500/25 bg-[#0b1830] text-slate-200 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <SkipBack className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold">{localize("Prev Line")}</span>
          </button>

          <button
            onClick={handleTogglePlay}
            className={`flex h-11 px-5 items-center justify-center gap-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
              isPlaying
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.45)]"
                : "bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-[0_0_24px_rgba(0,240,255,0.45)]"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-slate-950" />
                <span>{localize("Pause Stream")}</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-slate-950 ml-0.5" />
                <span>{localize("Play Video & Audio")}</span>
              </>
            )}
          </button>

          <button
            onClick={handleNextTurn}
            disabled={currentTurnIndex >= parsedData.turns.length - 1}
            className="flex h-11 items-center gap-1.5 px-3 rounded-xl border border-cyan-500/25 bg-[#0b1830] text-slate-200 hover:border-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <span className="text-xs font-bold">{localize("Next Line")}</span>
            <SkipForward className="h-4 w-4 text-cyan-400" />
          </button>

          <button
            onClick={handleRestart}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/25 bg-[#0b1830] text-slate-200 hover:border-cyan-400 transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4 text-cyan-400" />
          </button>
        </div>

        {/* Turn Progress Scrubber */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-cyan-300">
            {localize("Turn")} {currentTurnIndex + 1} / {parsedData.turns.length}
          </span>
          <div className="flex items-center gap-1">
            {parsedData.turns.map((t, idx) => (
              <button
                key={idx}
                onClick={() => handleJumpToTurn(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentTurnIndex === idx
                    ? "w-6 bg-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                    : t.type === "pause"
                    ? "w-2 bg-amber-400"
                    : "w-2 bg-slate-700 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-cyan-500/25 bg-[#0b1830] p-0.5 text-xs font-bold text-slate-300">
            <span className="px-1.5 text-[10px] uppercase tracking-wider text-slate-400">{localize("Speed")}</span>
            {[0.8, 1.0, 1.2].map((speed) => (
              <button
                key={speed}
                onClick={() => onRateChange(speed)}
                className={`rounded px-2 py-0.5 transition cursor-pointer ${
                  playbackRate === speed
                    ? "bg-cyan-400 text-slate-950 font-black"
                    : "hover:text-white"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {onScrollToQuestions && (
            <button
              onClick={onScrollToQuestions}
              className="flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-extrabold text-cyan-300 hover:bg-cyan-500/25 transition cursor-pointer"
            >
              <span>{localize("Questions")}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* PROMINENT EXAM PAUSE BANNER */}
      {isReadingPause && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-amber-950/40 p-4 sm:p-5 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-sm shrink-0">
                <Timer className="h-6 w-6 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-0.5 text-xs font-black text-slate-950 uppercase tracking-wider">
                    {localize("Pause for reading the questions")}
                  </span>
                  <span className="rounded-md bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-xs font-mono font-black text-amber-300">
                    0:{pauseCountdown.toString().padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-100 font-medium">
                  {localize("The exam stream is paused so you can preview questions")} {(partNumber - 1) * 10 + 1} {localize("to")} {(partNumber - 1) * 10 + 10}.
                </p>
              </div>
            </div>

            <button
              onClick={skipReadingPause}
              className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 transition cursor-pointer shrink-0"
            >
              <span>{localize("Skip Pause • Continue Stream")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3D HOLOGRAPHIC VIDEO STAGE */}
      {viewMode === "hologram" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: 3D Animated Holographic Video Viewport */}
          <div className="lg:col-span-5 relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-[#020611] p-5 flex flex-col justify-between min-h-[290px]">
            {/* Rotating 3D Orbital Rings in Video Stage */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-85">
              <svg viewBox="0 0 320 320" className="w-64 h-64">
                <defs>
                  <radialGradient id="holoStageGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={currentTurn?.gender === "female" ? "#EC4899" : "#00F0FF"} stopOpacity="0.32" />
                    <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#020611" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="160" cy="160" r="140" fill="url(#holoStageGlow)" />

                {/* Outer Rotating Gyro Ring */}
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{ duration: isPlaying ? 12 : 40, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "160px 160px" }}
                >
                  <circle cx="160" cy="160" r="128" fill="none" stroke="#00F0FF" strokeWidth="1.2" strokeDasharray="10 6 2 6" strokeOpacity="0.45" />
                  <circle cx="160" cy="32" r="4" fill="#00F0FF" />
                  <circle cx="160" cy="288" r="4" fill="#3B82F6" />
                </motion.g>

                {/* Middle Counter-Rotating Ring */}
                <motion.g
                  animate={{ rotate: -360 }}
                  transition={{ duration: isPlaying ? 8 : 28, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "160px 160px" }}
                >
                  <circle cx="160" cy="160" r="98" fill="none" stroke={currentTurn?.gender === "female" ? "#F472B6" : "#38BDF8"} strokeWidth="1.5" strokeDasharray="24 12" strokeOpacity="0.6" />
                  <polygon points="160,56 165,66 155,66" fill="#00F0FF" />
                </motion.g>

                {/* Inner Pulsing Core Ring */}
                <motion.circle
                  cx="160"
                  cy="160"
                  r="68"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeOpacity="0.55"
                  animate={{ scale: isPlaying && !isReadingPause ? [1, 1.12, 1] : 1 }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  style={{ transformOrigin: "160px 160px" }}
                />

                {/* Holographic Avatar Silhouette */}
                <circle cx="160" cy="142" r="20" fill={currentTurn?.gender === "female" ? "#F472B6" : "#00F0FF"} fillOpacity="0.85" />
                <path
                  d="M126 196 C126 172, 194 172, 194 196"
                  fill="none"
                  stroke={currentTurn?.gender === "female" ? "#F472B6" : "#00F0FF"}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Top HUD Overlay */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 px-2.5 py-1 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                <span className={`h-2 w-2 rounded-full ${isPlaying ? "bg-emerald-400 animate-ping" : "bg-cyan-400"}`} />
                {isPlaying ? "LIVE HOLOGRAM FEED" : "HOLOGRAM STANDBY"}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                CH-0{partNumber} • 24kHz
              </span>
            </div>

            {/* Bottom Speaker & Live Waveform Equalizer */}
            <div className="relative z-10 space-y-2.5 bg-[#040b1a]/85 backdrop-blur-md p-3 rounded-xl border border-cyan-500/25">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                    {currentTurn?.gender === "female" ? "♀ FEMALE HOLOGRAM" : currentTurn?.gender === "male" ? "♂ MALE HOLOGRAM" : "EXAM DIRECTOR"}
                  </div>
                  <div className="text-sm font-black text-white">
                    {currentTurn ? localize(currentTurn.speakerName) : "Narrator"}
                  </div>
                </div>
                <div className="flex items-end gap-1 h-7">
                  {[14, 24, 18, 28, 12, 26, 20, 30, 16, 22, 26, 14].map((h, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        height: isPlaying && !isReadingPause ? [6, h, 8] : 5,
                      }}
                      transition={{
                        duration: 0.35 + (i % 4) * 0.08,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                      className={`w-1 rounded-full ${
                        currentTurn?.gender === "female" ? "bg-pink-400" : "bg-cyan-400"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Progress bar inside active turn */}
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${isPlaying ? spokenCharProgress : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Synchronized Interactive Dialogue Feed */}
          <div
            ref={conversationScrollRef}
            className="lg:col-span-7 max-h-[290px] overflow-y-auto pr-1 space-y-2.5 scroll-smooth rounded-2xl border border-cyan-500/25 bg-[#050d1f] p-3.5"
          >
            {parsedData.turns.map((turn, index) => {
              const isActive = currentTurnIndex === index;
              if (turn.type === "pause") {
                return (
                  <div
                    key={turn.id}
                    id={`dialogue-turn-${index}`}
                    onClick={() => handleJumpToTurn(index)}
                    className={`flex items-center justify-center p-2.5 rounded-xl border transition cursor-pointer ${
                      isActive
                        ? "border-amber-400 bg-amber-500/15 text-amber-200"
                        : "border-amber-500/30 bg-amber-950/20 text-amber-300/80 hover:bg-amber-950/40"
                    }`}
                  >
                    <Timer className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                    <span className="text-xs font-bold">[{localize("15s Question Reading Pause")}]</span>
                  </div>
                );
              }

              return (
                <div
                  key={turn.id}
                  id={`dialogue-turn-${index}`}
                  onClick={() => handleJumpToTurn(index)}
                  className={`group flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "border-cyan-400 bg-cyan-500/15 shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                      : "border-slate-800 bg-[#081329]/80 hover:border-cyan-500/40"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                      turn.gender === "female"
                        ? "bg-pink-500/20 text-pink-300 border border-pink-400/40"
                        : turn.gender === "male"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                        : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {turn.gender === "female" ? "♀" : turn.gender === "male" ? "♂" : "N"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-black text-cyan-200">{localize(turn.speakerName)}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {isActive && isPlaying ? localize("● PLAYING") : localize("Click to play")}
                      </span>
                    </div>
                    <p data-no-translate data-test-content className="text-xs sm:text-sm leading-relaxed text-slate-100">
                      {turn.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONVERSATION VIEW */}
      {viewMode === "conversation" && (
        <div 
          ref={conversationScrollRef}
          className="max-h-[360px] overflow-y-auto pr-1 space-y-3 scroll-smooth rounded-xl border border-cyan-500/25 bg-[#050d1f] p-3 sm:p-4"
        >
          {parsedData.turns.map((turn, index) => {
            const isActive = currentTurnIndex === index;
            const isPauseTurn = turn.type === "pause";

            if (isPauseTurn) {
              return (
                <div
                  key={turn.id}
                  id={`dialogue-turn-${index}`}
                  onClick={() => handleJumpToTurn(index)}
                  className="flex items-center justify-center p-3 rounded-xl border border-amber-500/40 bg-amber-950/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                    <Timer className="h-4 w-4 text-amber-400" />
                    <span>[{localize("Exam Pause for reading questions — 15 seconds")}]</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={turn.id}
                id={`dialogue-turn-${index}`}
                onClick={() => handleJumpToTurn(index)}
                className={`group relative flex gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? "border-cyan-400 bg-cyan-500/15"
                    : "border-slate-800 bg-[#081329] hover:border-cyan-500/40"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-cyan-300">{localize(turn.speakerName)}</span>
                  </div>
                  <p data-no-translate data-test-content className="text-xs sm:text-sm leading-relaxed text-slate-100">
                    {turn.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLASSIC FULL SCRIPT VIEW */}
      {viewMode === "classic" && (
        <div className="max-h-[360px] overflow-y-auto rounded-xl border border-cyan-500/25 bg-[#050d1f] p-4 font-serif text-sm leading-relaxed text-slate-100 whitespace-pre-line">
          <span data-no-translate data-test-content>{script}</span>
        </div>
      )}
    </div>
  );
};
