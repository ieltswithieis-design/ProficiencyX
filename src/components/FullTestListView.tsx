import React from "react";
import { motion } from "motion/react";
import { fullIeltsTests } from "../data/fullTestsData";
import { FullIeltsTest } from "../types/ielts";
import { ProgressState } from "../utils/storage";
import { useLanguage } from "../context/LanguageContext";
import {
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Award,
  ArrowRight,
  Zap
} from "lucide-react";

interface FullTestListViewProps {
  progress: ProgressState;
  tests?: FullIeltsTest[];
  onSelectFullTest: (test: FullIeltsTest) => void;
  onOpenCertificate: () => void;
}

export const FullTestListView: React.FC<FullTestListViewProps> = ({
  progress,
  tests = fullIeltsTests,
  onSelectFullTest,
  onOpenCertificate,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Command Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="chrono-panel chrono-reticle rounded-2xl p-6 sm:p-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
              <Zap className="h-3.5 w-3.5" />
              <span>{t("examSimulationBadge", "SEQUENCED 4-SKILL MOCK BATTERY")}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-300">{t("practiceTestsRange", `${tests.length} Complete Examinations`)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              {t("fullMockBannerTitle", "Complete 4-Skill IELTS Academic Simulations")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {t(
                "fullMockBannerDesc",
                "Each simulation links Listening, Reading, Writing, and Speaking under official countdown timers and records your highest band into your TRF certificate."
              )}
            </p>
          </div>

          <button
            onClick={onOpenCertificate}
            className="btn-chrono-primary flex items-center gap-2 rounded-xl px-5 py-3 text-xs shrink-0 cursor-pointer whitespace-nowrap"
          >
            <Award className="h-4 w-4" />
            <span>{t("viewOfficialTrf", "Open Official TRF Ledger")}</span>
          </button>
        </div>
      </motion.div>

      {/* Grid of Full Simulations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tests.map((test, idx) => {
          const isReadingDone =
            !!progress.attempts[`reading_${test.readingId}`] ||
            !!progress.attempts[`reading-${test.readingId}`];
          const isListeningDone =
            !!progress.attempts[`listening_${test.listeningId}`] ||
            !!progress.attempts[`listening-${test.listeningId}`];
          const isWritingDone =
            !!progress.attempts[`writing_${test.writingId}`] ||
            !!progress.attempts[`writing-${test.writingId}`];
          const isSpeakingDone =
            !!progress.attempts[`speaking_${test.speakingId}`] ||
            !!progress.attempts[`speaking-${test.speakingId}`];

          const completedCount = [
            isReadingDone,
            isListeningDone,
            isWritingDone,
            isSpeakingDone,
          ].filter(Boolean).length;
          const isFullyComplete = completedCount === 4;

          return (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
              whileHover={{ y: -4 }}
              className="chrono-panel chrono-reticle flex flex-col justify-between rounded-2xl p-5 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5 text-xs font-mono">
                  <span className="text-cyan-400 tabular-nums">
                    SIMULATION #{test.id.toString().padStart(2, "0")}
                  </span>
                  <span className="text-slate-400">{test.difficulty}</span>
                </div>

                <h3 className="text-base font-display font-bold text-white group-hover:text-cyan-300 transition">
                  {test.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {test.subTitle}
                </p>

                {/* 4 Skill Sub-Chambers */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div
                    className={`flex items-center gap-1.5 rounded-lg p-2 border ${
                      isListeningDone
                        ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
                        : "bg-[#050b16] border-cyan-500/20 text-slate-300"
                    }`}
                  >
                    <Headphones className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{t("navListening", "Listening")}</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 rounded-lg p-2 border ${
                      isReadingDone
                        ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
                        : "bg-[#050b16] border-cyan-500/20 text-slate-300"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{t("navReading", "Reading")}</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 rounded-lg p-2 border ${
                      isWritingDone
                        ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
                        : "bg-[#050b16] border-cyan-500/20 text-slate-300"
                    }`}
                  >
                    <PenTool className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{t("navWriting", "Writing")}</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 rounded-lg p-2 border ${
                      isSpeakingDone
                        ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
                        : "bg-[#050b16] border-cyan-500/20 text-slate-300"
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{t("navSpeaking", "Speaking")}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-cyan-500/15 flex items-center justify-between text-xs font-mono text-slate-400 tabular-nums">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{test.estimatedTime}</span>
                  </div>
                  <span className="text-cyan-300">
                    {completedCount} / 4 {t("statusCompleted", "DONE")}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onSelectFullTest(test)}
                className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs cursor-pointer ${
                  isFullyComplete ? "btn-chrono-secondary" : "btn-chrono-primary"
                }`}
              >
                {isFullyComplete ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{t("iqRetakeTest", "Re-Initialize Battery")}</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{t("startPractice", "Initialize Simulation")}</span>
                  </>
                )}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
