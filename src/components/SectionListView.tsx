import React, { useState } from "react";
import { motion } from "motion/react";
import { TestSection, IeltsDatabase } from "../types/ielts";
import { ProgressState } from "../utils/storage";
import { useLanguage } from "../context/LanguageContext";
import { BookOpen, Headphones, PenTool, Mic, CheckCircle2, Clock, ArrowRight } from "lucide-react";

interface SectionListViewProps {
  section: TestSection;
  database: IeltsDatabase;
  progress: ProgressState;
  onSelectTest: (section: TestSection, testId: number) => void;
}

export const SectionListView: React.FC<SectionListViewProps> = ({
  section,
  database,
  progress,
  onSelectTest,
}) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<"all" | "completed" | "uncompleted">("all");

  const meta = {
    reading: {
      code: "01 · ANALYTICAL COMPREHENSION CHAMBER",
      title: "Academic Reading Practice Tests",
      icon: BookOpen,
      count: database.reading.length,
      time: "60 MIN · 3 PASSAGES · 40 ITEMS",
      desc: "Authentic academic research papers with True/False/Not Given, Multiple Choice, and Completion items. Automatic calibration on the 9.0 Band scale.",
      accent: "text-cyan-400",
    },
    listening: {
      code: "02 · ACOUSTIC PROCESSING CHAMBER",
      title: "Listening Practice Tests",
      icon: Headphones,
      count: database.listening.length,
      time: "30 MIN · 4 CHANNELS · 40 ITEMS",
      desc: "Multi-accent audio speech simulations across social and academic dialogues with synchronized playback and instant band scoring.",
      accent: "text-blue-400",
    },
    writing: {
      code: "03 · SYNTACTIC COMPOSITION CHAMBER",
      title: "Academic Writing Practice Tests",
      icon: PenTool,
      count: database.writing.length,
      time: "60 MIN · TASK 1 (150W) & TASK 2 (250W)",
      desc: "Interactive visual data charts, tables, and process diagrams paired with Task 2 Essay prompts and 4-criterion AI examiner evaluation.",
      accent: "text-amber-400",
    },
    speaking: {
      code: "04 · VOCAL BIOMETRICS CHAMBER",
      title: "Speaking Practice Tests",
      icon: Mic,
      count: database.speaking.length,
      time: "11–14 MIN · PARTS 1, 2 & 3",
      desc: "Interactive Part 1 interview prompts, Part 2 timed cue cards, live microphone capture, verbatim transcription, and AI speech diagnostics.",
      accent: "text-emerald-400",
    },
  }[section];

  const Icon = meta.icon;

  let completedInSection = 0;
  for (let i = 1; i <= meta.count; i++) {
    if (progress.completed[`${section}-${i}`]) completedInSection++;
  }

  const rawList = database[section] as any[];

  const filtered = rawList.filter((tItem) => {
    const isDone = !!progress.completed[`${section}-${tItem.id}`];
    if (filter === "completed") return isDone;
    if (filter === "uncompleted") return !isDone;
    return true;
  });

  const pct = meta.count > 0 ? Math.round((completedInSection / meta.count) * 100) : 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Section Command Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="chrono-panel chrono-reticle rounded-2xl p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#050b16] border border-cyan-500/35">
              <Icon className={`h-6 w-6 ${meta.accent}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
                <span>{meta.code}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300 tabular-nums">
                  {completedInSection} / {meta.count} {t("statusCompleted", "Completed")}
                </span>
              </div>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
                {meta.title}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {meta.desc}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-cyan-500/20 shrink-0">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-cyan-300 tabular-nums leading-tight">
                {pct}%
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                {t("statusCompleted", "Calibrated")}
              </span>
            </div>
            <div className="h-2 w-36 overflow-hidden rounded-full bg-[#050b16] border border-cyan-500/25">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-cyan-500/20 pt-4">
          <span className="text-xs font-mono text-cyan-300 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>{meta.time}</span>
          </span>

          <div className="flex rounded-lg border border-cyan-500/25 bg-[#050b16] p-1 gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-md px-3 py-1 text-xs font-mono transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-cyan-400 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t("allFilter", "All").replace(/\s*\(\d+\)/g, "")} ({meta.count})
            </button>
            <button
              onClick={() => setFilter("uncompleted")}
              className={`rounded-md px-3 py-1 text-xs font-mono transition-colors cursor-pointer ${
                filter === "uncompleted"
                  ? "bg-cyan-400 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t("statusPending", "Pending")} ({meta.count - completedInSection})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`rounded-md px-3 py-1 text-xs font-mono transition-colors cursor-pointer ${
                filter === "completed"
                  ? "bg-cyan-400 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t("statusCompleted", "Completed")} ({completedInSection})
            </button>
          </div>
        </div>
      </motion.div>

      {/* Grid of Tests */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tItem, idx) => {
          const isDone = !!progress.completed[`${section}-${tItem.id}`];
          const attempt = progress.attempts[`${section}-${tItem.id}`];

          let details = "";
          if (section === "reading") {
            details = "3 Passages · 40 Questions · 60 mins";
          } else if (section === "listening") {
            details = "4 Audio Channels · 40 Questions · 30 mins";
          } else if (section === "writing") {
            details = `Task 1: ${tItem.task1_type} · Task 2: Essay`;
          } else {
            details = "Parts 1, 2 & 3 · Live Voice AI";
          }

          return (
            <motion.div
              key={tItem.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(idx * 0.03, 0.3) }}
              whileHover={{ y: -3 }}
              className="chrono-panel chrono-reticle flex flex-col justify-between rounded-xl p-5"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5 text-xs font-mono">
                  <span className="text-cyan-400 tabular-nums">
                    MODULE #{String(tItem.id).padStart(2, "0")}
                  </span>

                  {isDone ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold tabular-nums">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{attempt?.band ? `BAND ${attempt.band}` : t("statusCompleted", "DONE")}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">{t("statusPending", "READY")}</span>
                  )}
                </div>

                <h3 className="text-base font-display font-bold text-white leading-snug">
                  {tItem.title}
                </h3>
                <p className="mt-1 text-xs font-mono text-slate-400">
                  {details}
                </p>

                {isDone && attempt?.score !== undefined && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#050b16] border border-cyan-500/20 p-2 text-xs font-mono tabular-nums text-slate-300">
                    <span>
                      {t("score", "Raw")}: <strong className="text-white">{attempt.score}/40</strong>
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>
                      {t("bandScore", "Band")}: <strong className="text-cyan-300">{attempt.band}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-cyan-500/15 pt-3.5 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  {isDone ? t("reviewAnswers", "Telemetry Logged") : "Timed Simulation"}
                </span>

                <button
                  onClick={() => onSelectTest(section, tItem.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs cursor-pointer ${
                    isDone ? "btn-chrono-secondary" : "btn-chrono-primary"
                  }`}
                >
                  <span>{isDone ? t("reviewAnswers", "Recalibrate") : t("startPractice", "Initialize")}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
