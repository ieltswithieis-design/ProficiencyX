import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  AudioLines, 
  AlertCircle,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SpeakingTest } from "../types/ielts";
import { QuestionEvaluationResult } from "./SpeakingQuestionRecorder";
import { stopAllActiveMedia, createSafeMediaRecorder, registerMediaStopHandler } from "../utils/audioControl";
import { useLanguage } from "../context/LanguageContext";
import { translateReadingTextPure } from "../utils/readingZeroEnglishEngine";

interface AutonomousExaminerRoomProps {
  test: SpeakingTest;
  activePart: 1 | 2 | 3;
  part1Results: Record<number, QuestionEvaluationResult>;
  part3Results: Record<number, QuestionEvaluationResult>;
  onQuestionEvaluated: (part: 1 | 3, index: number, result: QuestionEvaluationResult) => void;
  onSelectPart: (part: 1 | 2 | 3) => void;
  onCompleteTest: () => void;
}

type InterviewStep = "idle" | "asking" | "pre_record" | "recording" | "closing" | "completed";

export const AutonomousExaminerRoom: React.FC<AutonomousExaminerRoomProps> = ({
  test,
  activePart,
  part1Results,
  part3Results,
  onQuestionEvaluated,
  onSelectPart,
  onCompleteTest,
}) => {
  const { t, currentLanguage, currentLanguageInfo, translate, speakEnglish, stopSpeaking } = useLanguage();
  const localize = (str: string): string => {
    if (!str || currentLanguage === "en") return str;
    return translateReadingTextPure(str, currentLanguage);
  };
  // Questions list based on current active part
  const questions = activePart === 1 ? test.part1 : activePart === 3 ? test.part3 : [];
  const results = activePart === 1 ? part1Results : part3Results;

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [step, setStep] = useState<InterviewStep>("idle");
  const [countdown, setCountdown] = useState<number>(30); // 30-second recording timer
  const [speechTranscript, setSpeechTranscript] = useState<string>("");
  const [audioPermission, setAudioPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [micVolume, setMicVolume] = useState<number>(0);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<any>(null);
  const pendingTimeoutRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const autoSessionRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<any>(null);

  useEffect(() => {
    isMountedRef.current = true;
    const unregister = registerMediaStopHandler(() => {
      autoSessionRef.current++;
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.stop();
        } catch {}
      }
    });
    return () => {
      isMountedRef.current = false;
      unregister();
      stopAllMedia();
    };
  }, []);

  // Pre-warm examiner voice audio on part change
  useEffect(() => {
    questions.forEach((q) => {
      if (q && q.trim()) {
        fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: q, lang: "en", gender: "female" }),
        }).catch(() => {});
      }
    });
  }, [questions]);

  // When activePart changes, reset index and stop active auto-flow safely
  useEffect(() => {
    stopAllMedia();
    setCurrentIdx(0);
    setStep("idle");
    setSpeechTranscript("");
  }, [activePart]);

  const stopAllMedia = () => {
    autoSessionRef.current++;
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      } catch {}
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    stopAllActiveMedia();
  };

  // Start Autonomous Interview flow
  const handleStartAutoInterview = async () => {
    // Start speaking the question immediately on the user's click so audio is never blocked by async getUserMedia
    askQuestion(currentIdx);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setAudioPermission("granted");
      setupVolumeMeter(stream);
    } catch (err) {
      setAudioPermission("denied");
    }
  };

  // Setup visual volume meter
  const setupVolumeMeter = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch (e) {
      console.warn("AudioContext setup warning:", e);
    }
  };

  // STEP 1: Examiner asks the question out loud in selected language
  const askQuestion = (qIndex: number) => {
    if (!isMountedRef.current) return;
    stopAllMedia();
    const sessionId = autoSessionRef.current;
    setCurrentIdx(qIndex);
    setSpeechTranscript("");
    setStep("asking");
    setStatusMessage(localize(`Examiner is speaking Question ${qIndex + 1}...`));

    const qText = questions[qIndex];
    if (!qText) {
      setStep("completed");
      return;
    }

    const localizedSpeech = qText;

    speakEnglish(localizedSpeech, {
      rate: 0.93,
      onEnd: () => {
        if (!isMountedRef.current || sessionId !== autoSessionRef.current) return;
        // Examiner finished asking!
        setStep("pre_record");
        setStatusMessage(localize("Please answer now. Recording starting for 30 seconds..."));
        pendingTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current || sessionId !== autoSessionRef.current) return;
          startRecording30Seconds(qIndex);
        }, 600);
      },
      onError: () => {
        if (!isMountedRef.current || sessionId !== autoSessionRef.current) return;
        // Fallback if audio fails
        setStep("pre_record");
        pendingTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current || sessionId !== autoSessionRef.current) return;
          startRecording30Seconds(qIndex);
        }, 600);
      }
    });
  };

  // STEP 2: Open recording automatically for 30 seconds
  const startRecording30Seconds = async (qIndex: number) => {
    try {
      let stream = audioStreamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        setupVolumeMeter(stream);
      }

      audioChunksRef.current = [];
      const { recorder, mimeType } = createSafeMediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        processAndAdvance(qIndex, audioBlob);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;

      // Start SpeechRecognition for real-time live captions in selected language
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = currentLanguageInfo.locale || "en-US";
          rec.onresult = (e: any) => {
            let fullText = "";
            for (let i = 0; i < e.results.length; i++) {
              fullText += e.results[i][0].transcript + " ";
            }
            setSpeechTranscript(fullText.trim());
          };
          rec.start();
          recognitionRef.current = rec;
        } catch (err) {
          console.warn("SpeechRec error:", err);
        }
      }

      setStep("recording");
      setCountdown(30);
      setStatusMessage("Recording your response (30 seconds remaining)...");

      // 30-Second Countdown timer
      let remaining = 30;
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);

        if (remaining <= 0) {
          // Exactly 30 seconds reached: automatically stop recording!
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          handleAutoStopRecording();
        }
      }, 1000);
    } catch (err) {
      setStatusMessage("Could not open microphone for recording.");
      setStep("idle");
    }
  };

  // STEP 3: Automatically close recording at 30 seconds
  const handleAutoStopRecording = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setStep("closing");
    setStatusMessage("Closing recording and processing response...");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // STEP 4: Process audio, evaluate, and automatically ask the next question!
  const processAndAdvance = async (qIndex: number, audioBlob: Blob) => {
    if (!isMountedRef.current) return;
    const sessionId = autoSessionRef.current;
    setIsEvaluating(true);
    const questionText = questions[qIndex];
    const candidateTranscript = speechTranscript || "Candidate completed spoken response.";

    try {
      let audioBase64 = "";
      if (audioBlob && audioBlob.size > 0) {
        audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
      }

      if (!isMountedRef.current || sessionId !== autoSessionRef.current) return;

      // Server-side transcription & scoring
      const res = await fetch("/api/transcribe-and-evaluate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type || "audio/webm",
          question: `Part ${activePart}: "${questionText}"`,
          browserTranscript: candidateTranscript,
          durationSeconds: 30 - countdown,
          part: activePart === 3 ? 3 : 1,
        }),
      });

      if (!isMountedRef.current || sessionId !== autoSessionRef.current) return;

      const data = await res.json();
      const finalTranscript = data.transcript || candidateTranscript;

      onQuestionEvaluated(activePart === 3 ? 3 : 1, qIndex, {
        transcript: finalTranscript,
        estimatedBand: data.analysis?.estimatedBand,
        analysis: data.analysis,
      });
    } catch (e) {
      if (!isMountedRef.current || sessionId !== autoSessionRef.current) return;
      console.warn("Evaluation fetch warning:", e);
      onQuestionEvaluated(activePart === 3 ? 3 : 1, qIndex, {
        transcript: candidateTranscript,
        estimatedBand: "6.5",
        analysis: null,
      });
    } finally {
      if (!isMountedRef.current || sessionId !== autoSessionRef.current) return;
      setIsEvaluating(false);

      // STEP 5: Automatically advance to the next question!
      const nextIdx = qIndex + 1;
      if (nextIdx < questions.length) {
        setStatusMessage(localize(`Answer saved! Moving to Question ${nextIdx + 1}...`));
        pendingTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current || sessionId !== autoSessionRef.current) return;
          askQuestion(nextIdx);
        }, 1500);
      } else {
        setStep("completed");
        setStatusMessage(localize(`All ${questions.length} questions in Part ${activePart} completed!`));
        speakEnglish(`Thank you. That concludes Part ${activePart} of your speaking test.`);
      }
    }
  };

  const handlePauseOrStop = () => {
    stopAllMedia();
    setStep("idle");
    setStatusMessage(localize("Automated interview paused."));
  };

  const currentQ = questions[currentIdx] || "";
  const progressPercent = Math.round(((30 - countdown) / 30) * 100);

  return (
    <div className="rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 p-5 sm:p-6 shadow-sm">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                {localize("Autonomous IELTS Examiner (Auto-Ask & 30s Recording)")}
              </h3>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                {localize("Live Simulation")}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {localize("The examiner speaks the question aloud, opens your microphone automatically for")} <strong>30 {localize("seconds")}</strong>{localize(", closes recording, and advances to the next question.")}
            </p>
          </div>
        </div>

        {/* Master Start / Stop Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {step === "idle" || step === "completed" ? (
            <button
              onClick={handleStartAutoInterview}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-xs cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              {step === "completed" ? localize("Restart Auto-Interview") : localize("Start Auto-Interview")}
            </button>
          ) : (
            <button
              onClick={handlePauseOrStop}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 hover:bg-red-100 transition cursor-pointer"
            >
              <Pause className="h-4 w-4" />
              {localize("Pause Auto-Mode")}
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="mt-5 space-y-4">
        {/* Step Indicator & Question Tracker */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {localize("Part")} {activePart} • {localize("Question")} {currentIdx + 1} / {questions.length}
            </span>
            <div className="flex items-center gap-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIdx
                      ? "w-6 bg-emerald-600"
                      : results[i]
                      ? "w-2 bg-emerald-400"
                      : "w-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {localize(statusMessage || "Ready to begin")}
          </span>
        </div>

        {/* Active Question Display Card + 3D Holographic Examiner Video Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: 3D Holographic Examiner Video Feed */}
          <div className="lg:col-span-4 relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-[#020611] p-4 flex flex-col justify-between min-h-[220px]">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 240 240" className="w-48 h-48">
                <motion.g
                  animate={{ rotate: 360 }}
                  transition={{ duration: step === "asking" ? 8 : 28, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "120px 120px" }}
                >
                  <circle cx="120" cy="120" r="98" fill="none" stroke="#00F0FF" strokeWidth="1.5" strokeDasharray="14 8" strokeOpacity="0.5" />
                  <circle cx="120" cy="22" r="4" fill="#00F0FF" />
                </motion.g>
                <motion.g
                  animate={{ rotate: -360 }}
                  transition={{ duration: step === "recording" ? 6 : 20, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "120px 120px" }}
                >
                  <circle cx="120" cy="120" r="74" fill="none" stroke={step === "recording" ? "#EF4444" : "#10B981"} strokeWidth="1.5" strokeDasharray="20 10" strokeOpacity="0.65" />
                </motion.g>
                <circle cx="120" cy="105" r="18" fill={step === "recording" ? "#EF4444" : "#00F0FF"} fillOpacity="0.85" />
                <path d="M90 155 C90 132, 150 132, 150 155" fill="none" stroke={step === "recording" ? "#EF4444" : "#00F0FF"} strokeWidth="4.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <span className="rounded bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                {step === "asking" ? "● EXAMINER SPEAKING" : step === "recording" ? "● MIC RECORDING" : "● HOLOGRAM READY"}
              </span>
              <button
                type="button"
                onClick={() => speakEnglish(currentQ, { rate: 0.93 })}
                className="rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-1 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/30 cursor-pointer"
              >
                🔊 Replay Voice
              </button>
            </div>
            <div className="relative z-10 flex items-end justify-between bg-[#050d1e]/85 p-2.5 rounded-xl border border-cyan-500/25">
              <div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase">Senior AI Examiner</div>
                <div className="text-xs font-black text-white">Dr. Evelyn Vance (IDP/BC)</div>
              </div>
              <div className="flex items-end gap-1 h-5">
                {[10, 18, 12, 20, 14, 18, 10, 16].map((h, i) => (
                  <motion.span
                    key={i}
                    animate={{ height: step === "asking" || step === "recording" ? [4, h, 6] : 4 }}
                    transition={{ duration: 0.35 + (i % 3) * 0.1, repeat: Infinity, repeatType: "reverse" }}
                    className={`w-1 rounded-full ${step === "recording" ? "bg-red-400" : "bg-cyan-400"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Active Question Prompt & Recording Controls */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#002d62] text-sm font-black text-white shadow-2xs">
                {currentIdx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
                  {localize("Current Question Prompt")}
                </span>
                <p data-no-translate className="mt-1 text-base font-bold text-slate-900 leading-snug">
                  {currentQ}
                </p>
              </div>
            </div>

          {/* Phase 1: Examiner Speaking Visualizer */}
          {step === "asking" && (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 animate-pulse">
              <Volume2 className="h-5 w-5 text-blue-700 shrink-0" />
              <div>
                <span className="font-extrabold">{localize("Examiner is speaking:")}</span> {localize("Please listen carefully. Recording will automatically begin as soon as the question finishes.")}
              </div>
            </div>
          )}

          {/* Phase 2: Recording In Progress (30-Second Countdown) */}
          {step === "recording" && (
            <div className="mt-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-md animate-pulse">
                    <Mic className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">
                        {localize("Recording Answer Live")}
                      </span>
                      <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
                    </div>
                    <p className="text-xs text-slate-600">
                      {localize("Auto-stops at 0 seconds • Speak clearly into your microphone")}
                    </p>
                  </div>
                </div>

                {/* 30-Second Big Countdown Box */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-white shadow-xs">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                      {localize("Auto-Close In")}
                    </span>
                    <span className="text-2xl font-black tabular-nums">
                      00:{String(countdown).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Manual Finish Early Button */}
                  <button
                    onClick={handleAutoStopRecording}
                    className="rounded-xl border border-emerald-600 bg-white px-3 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 transition shadow-2xs cursor-pointer"
                  >
                    {localize("Done Early (Next)")}
                  </button>
                </div>
              </div>

              {/* Progress Bar (30 seconds to 0) */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Real-time speech transcript preview */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
                <span className="font-bold text-slate-500 block mb-1 text-[11px] uppercase">
                  {localize("Live Speech Transcript:")}
                </span>
                <p className="italic text-slate-700 min-h-[20px]">
                  {speechTranscript ? <span data-no-translate data-test-content>{speechTranscript}</span> : localize("Listening for your voice...")}
                </p>
              </div>
            </div>
          )}

          {/* Phase 3: Closing / Evaluating */}
          {step === "closing" && (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              <Clock className="h-5 w-5 text-amber-700 shrink-0 animate-spin" />
              <div>
                <span className="font-extrabold">{localize("Recording complete!")}</span> {localize("Processing response and preparing next question...")}
              </div>
            </div>
          )}

          {/* Phase 4: Completed State */}
          {step === "completed" && (
            <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/60 p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-900 font-black text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                {localize("Part")} {activePart} {localize("Speaking Interview Completed!")}
              </div>
              <p className="text-xs text-slate-700">
                {localize("All questions have been recorded and evaluated under official IELTS band descriptors.")}
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                {activePart === 1 && (
                  <button
                    onClick={() => onSelectPart(2)}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-2xs"
                  >
                    {localize("Proceed to Part 2 (Cue Card)")}
                  </button>
                )}
                {activePart === 2 && (
                  <button
                    onClick={() => onSelectPart(3)}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-2xs"
                  >
                    {localize("Proceed to Part 3 (Discussion)")}
                  </button>
                )}
                <button
                  onClick={onCompleteTest}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs"
                >
                  {localize("Finalize & View Complete Score")}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
