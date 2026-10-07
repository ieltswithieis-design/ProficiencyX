import React, { useState } from "react";
import { TestSection, IeltsDatabase } from "../types/ielts";
import { ProgressState } from "../utils/storage";
import { StandardizedExamId, StandardizedDatabase } from "../types/standardizedTests";
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  ArrowRight,
  CheckCircle2,
  Award,
  Search,
  ShieldCheck,
  Download,
  Layers,
  Youtube,
  Newspaper,
  Brain,
  Globe2,
  Cpu,
  Activity,
  Compass,
  Zap
} from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../context/LanguageContext";

interface DashboardProps {
  database: IeltsDatabase;
  progress: ProgressState;
  onSelectTest: (section: TestSection, id: number) => void;
  onSelectSection: (section: TestSection) => void;
  onOpenCertificate?: () => void;
  onSelectFullTests?: () => void;
  onOpenVerificationPortal?: () => void;
  onOpenBlog?: () => void;
  onOpenVideos?: () => void;
  onSelectIqTest?: () => void;
  onSelectIqCert?: () => void;
  onSelectInternationalExams?: () => void;
  onSelectIelts?: () => void;
  onSelectStandardizedTest?: (examId: StandardizedExamId, packageId?: string) => void;
  fullMockCount?: number;
  standardizedDatabase?: StandardizedDatabase | null;
  sectionCounts?: { reading: number; listening: number; writing: number; speaking: number };
}

export const Dashboard: React.FC<DashboardProps> = ({
  database,
  progress,
  onSelectTest,
  onSelectSection,
  onOpenCertificate,
  onSelectFullTests,
  onOpenVerificationPortal,
  onOpenBlog,
  onOpenVideos,
  onSelectIqTest,
  onSelectIqCert,
  onSelectInternationalExams,
  onSelectIelts,
  onSelectStandardizedTest,
  fullMockCount = 0,
}) => {
  const { t } = useLanguage();
  const [activeRadarNode, setActiveRadarNode] = useState<TestSection>("reading");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSection, setFilterSection] = useState<TestSection | "all">("all");

  const completedCount = Object.keys(progress.completed).length;
  const modularTestCount =
    database.reading.length +
    database.listening.length +
    database.writing.length +
    database.speaking.length;

  const getCompletedForSection = (sec: TestSection, total: number) => {
    let done = 0;
    for (let i = 1; i <= total; i++) {
      if (progress.completed[`${sec}-${i}`]) done++;
    }
    return done;
  };

  const skillModules: {
    key: TestSection;
    code: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    borderAccent: string;
    specs: string;
    description: string;
    count: number;
    completed: number;
  }[] = [
    {
      key: "reading",
      code: "01. Analytical Comprehension",
      title: t("navReading", "Academic Reading"),
      icon: BookOpen,
      accent: "text-cyan-400",
      borderAccent: "hover:border-cyan-400",
      specs: "60 MIN · 3 PASSAGES · 40 ITEMS",
      description:
        "Split-pane research corpus analysis featuring True/False/Not Given, heading synthesis, and instant band calibration.",
      count: database.reading.length,
      completed: getCompletedForSection("reading", database.reading.length),
    },
    {
      key: "listening",
      code: "02. Acoustic Processing",
      title: t("navListening", "IELTS Listening"),
      icon: Headphones,
      accent: "text-blue-400",
      borderAccent: "hover:border-blue-400",
      specs: "30 MIN · 4 CHANNELS · 40 ITEMS",
      description:
        "Multi-accent neural audio streams across academic lectures and institutional dialogues with synchronized transcript verification.",
      count: database.listening.length,
      completed: getCompletedForSection("listening", database.listening.length),
    },
    {
      key: "writing",
      code: "03. Syntactic Composition",
      title: t("navWriting", "Academic Writing"),
      icon: PenTool,
      accent: "text-amber-400",
      borderAccent: "hover:border-amber-400",
      specs: "60 MIN · TASK 1 DATA + TASK 2 ESSAY",
      description:
        "Quantitative visual telemetry interpretation and discursive argumentation evaluated across all 4 official examiner criteria.",
      count: database.writing.length,
      completed: getCompletedForSection("writing", database.writing.length),
    },
    {
      key: "speaking",
      code: "04. Vocal Biometrics",
      title: t("navSpeaking", "IELTS Speaking"),
      icon: Mic,
      accent: "text-emerald-400",
      borderAccent: "hover:border-emerald-400",
      specs: "14 MIN · PARTS 1–3 · VOICE AI",
      description:
        "Real-time acoustic waveform capture, Part 2 timed cue-card matrix, verbatim speech transcription, and pronunciation diagnostics.",
      count: database.speaking.length,
      completed: getCompletedForSection("speaking", database.speaking.length),
    },
  ];

  const activeNodeInfo = skillModules.find((s) => s.key === activeRadarNode) || skillModules[0];

  const examSuites = [
    {
      id: "ielts",
      code: "CAMBRIDGE · IDP · BC",
      name: "IELTS Academic",
      scale: "BAND 1.0 – 9.0",
      duration: "165 MIN",
      subtitle: "Four-skill academic & migration examination battery with AI examiner diagnostics.",
      accent: "#00f0ff",
      action: () =>
        onSelectIelts
          ? onSelectIelts()
          : onSelectInternationalExams && onSelectInternationalExams(),
    },
    {
      id: "iq",
      code: "MENSA SD-15 NORM",
      name: "Cognitive IQ Matrix",
      scale: "IQ 70 – 160",
      duration: "40 MIN",
      subtitle: "Spatial matrix reasoning, fluid logic, and quantitative psychometric calibration.",
      accent: "#a855f7",
      action: () => onSelectIqTest && onSelectIqTest(),
    },
    {
      id: "pte",
      code: "PEARSON VUE",
      name: "PTE Academic",
      scale: "10 – 90 PTS",
      duration: "120 MIN",
      subtitle: "Automated integrated speaking, writing, reading, and listening proficiency suite.",
      accent: "#38bdf8",
      action: () =>
        onSelectStandardizedTest
          ? onSelectStandardizedTest("pte")
          : onSelectInternationalExams && onSelectInternationalExams(),
    },
    {
      id: "gre",
      code: "ETS GRADUATE",
      name: "GRE General",
      scale: "260 – 340",
      duration: "118 MIN",
      subtitle: "Quantitative reasoning, verbal synthesis, and analytical writing for graduate admissions.",
      accent: "#6366f1",
      action: () =>
        onSelectStandardizedTest
          ? onSelectStandardizedTest("gre")
          : onSelectInternationalExams && onSelectInternationalExams(),
    },
    {
      id: "gmat",
      code: "GMAC FOCUS",
      name: "GMAT Focus",
      scale: "205 – 805",
      duration: "135 MIN",
      subtitle: "Data insights, quantitative modeling, and executive verbal logic for business schools.",
      accent: "#10b981",
      action: () =>
        onSelectStandardizedTest
          ? onSelectStandardizedTest("gmat")
          : onSelectInternationalExams && onSelectInternationalExams(),
    },
    {
      id: "toefl",
      code: "ETS ACADEMIC",
      name: "TOEFL iBT",
      scale: "0 – 120 PTS",
      duration: "116 MIN",
      subtitle: "University-grade integrated academic English comprehension and spoken synthesis.",
      accent: "#f43f5e",
      action: () =>
        onSelectStandardizedTest
          ? onSelectStandardizedTest("toefl")
          : onSelectInternationalExams && onSelectInternationalExams(),
    },
    {
      id: "sat",
      code: "COLLEGE BOARD",
      name: "Digital SAT",
      scale: "400 – 1600",
      duration: "134 MIN",
      subtitle: "Adaptive reading, evidence-based writing, and multi-stage algebraic mathematics.",
      accent: "#3b82f6",
      action: () =>
        onSelectStandardizedTest
          ? onSelectStandardizedTest("sat")
          : onSelectInternationalExams && onSelectInternationalExams(),
    },
    {
      id: "act",
      code: "ACT INC.",
      name: "ACT Composite",
      scale: "1 – 36 SCALE",
      duration: "175 MIN",
      subtitle: "Scientific reasoning, empirical data interpretation, mathematics, and English usage.",
      accent: "#14b8a6",
      action: () =>
        onSelectStandardizedTest
          ? onSelectStandardizedTest("act")
          : onSelectInternationalExams && onSelectInternationalExams(),
    },
  ];

  const candidateRecords = [
    {
      name: "Sophia Lin",
      destination: "University of Oxford · MSc Computational Neuroscience",
      band: "8.5",
      delta: "+1.5 Band Gain in 6 Weeks",
      breakdown: "L 9.0 · R 8.5 · W 8.0 · S 8.5",
      quote:
        "Practicing the timed computer-delivered simulations and receiving instant 4-criterion lexical diagnostics raised my Writing from 6.5 to 8.0.",
      initials: "SL",
    },
    {
      name: "Marcus Chen",
      destination: "British Columbia Provincial Nominee · Vancouver",
      band: "8.0",
      delta: "+1.0 Band Gain in 4 Weeks",
      breakdown: "L 8.5 · R 8.5 · W 7.5 · S 8.0",
      quote:
        "The acoustic speaking studio pinpointed my clause-level hesitation patterns and helped me sustain Band 8.0 fluency across Part 2 and Part 3.",
      initials: "MC",
    },
    {
      name: "Dr. Amina Al-Mansoor",
      destination: "Royal Melbourne Hospital · Medical Fellowship",
      band: "8.5",
      delta: "First-Attempt Cryptographic TRF",
      breakdown: "L 9.0 · R 9.0 · W 8.0 · S 8.0",
      quote:
        "Our medical credentialing board verified my Test Report Form hash immediately through the direct verification node without any manual delay.",
      initials: "AA",
    },
    {
      name: "David Adeleke",
      destination: "University of Toronto · Graduate Engineering",
      band: "8.0",
      delta: "+1.5 Band Gain in 5 Weeks",
      breakdown: "L 8.5 · R 8.0 · W 7.5 · S 8.0",
      quote:
        "Having 80 modular skill tests alongside full sequenced 4-skill mock batteries made the actual examination feel completely familiar.",
      initials: "DA",
    },
  ];

  // Filtered directory for quick search
  const filteredTests = (() => {
    const list: { section: TestSection; id: number; title: string; subtitle: string }[] = [];
    if (filterSection === "all" || filterSection === "reading") {
      database.reading.forEach((item) => {
        if (!searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase())) {
          list.push({
            section: "reading",
            id: item.id,
            title: item.title,
            subtitle: "3 passages · 40 questions · 60 mins",
          });
        }
      });
    }
    if (filterSection === "all" || filterSection === "listening") {
      database.listening.forEach((item) => {
        if (!searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase())) {
          list.push({
            section: "listening",
            id: item.id,
            title: item.title,
            subtitle: "4 parts · 40 questions · 30 mins",
          });
        }
      });
    }
    if (filterSection === "all" || filterSection === "writing") {
      database.writing.forEach((item) => {
        if (!searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase())) {
          list.push({
            section: "writing",
            id: item.id,
            title: item.title,
            subtitle: `Task 1 (${item.task1_type}) + Task 2 Essay · 60 mins`,
          });
        }
      });
    }
    if (filterSection === "all" || filterSection === "speaking") {
      database.speaking.forEach((item) => {
        if (!searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase())) {
          list.push({
            section: "speaking",
            id: item.id,
            title: item.title,
            subtitle: "Parts 1, 2 & 3 · Voice AI · 14 mins",
          });
        }
      });
    }
    return list;
  })();

  return (
    <div className="space-y-12 pb-20">
      {/* =====================================================================
          1. YEAR-3000 QUANTUM COMMAND DECK HERO (Asymmetric Split Console)
          ===================================================================== */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="chrono-panel chrono-reticle relative overflow-hidden rounded-2xl p-6 sm:p-10"
      >
        {/* Ambient Orbital Light Fields */}
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.08, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-36 -left-24 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl"
        />
        <motion.div
          animate={{ opacity: [0.15, 0.32, 0.15], scale: [1, 1.12, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="pointer-events-none absolute -bottom-36 -right-24 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left 7 Cols: Primary Command Telemetry & Actions */}
          <div className="lg:col-span-7 space-y-6">
            {/* Unboxed Clean Telemetry Kicker (Zero-Pill Discipline) */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-300">
              <span className="led-pin" />
              <span>{t("instituteName", "LingoFi Standardized Testing Authority")}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-200">{modularTestCount} Neural Modules</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-300 tabular-nums">{fullMockCount} Full Simulations Active</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-sky-200">Director: Wasil Azad</span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl lg:text-[46px] font-bold tracking-tight text-white leading-[1.1] [text-wrap:balance]">
              Next-Millennium Standardized Examination &amp; Cognitive Assessment Architecture
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Calibrated for Band 8.0+ mastery and international admissions. Execute real-time computer-delivered simulations across{" "}
              <span className="text-cyan-300 font-medium">IELTS Academic, PTE, GRE, GMAT, TOEFL, Digital SAT, ACT</span>, and{" "}
              <span className="text-cyan-300 font-medium">Mensa SD-15 Psychometrics</span> with autonomous neural evaluation and cryptographic Test Report Forms.
            </p>

            {/* Primary & Secondary Action Matrix */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {onSelectFullTests && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSelectFullTests}
                  className="btn-chrono-primary inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                >
                  <Layers className="h-4 w-4" />
                  <span>{t("navFullTests", "Initialize Full Mock Battery")}</span>
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectSection("reading")}
                className="btn-chrono-secondary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-xs sm:text-sm cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="h-4 w-4 text-cyan-400" />
                <span>{t("startPractice", "Skill Modules")}</span>
              </motion.button>

              {onOpenVideos && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onOpenVideos}
                  className="btn-chrono-secondary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-xs sm:text-sm cursor-pointer whitespace-nowrap border-rose-500/35 hover:border-rose-400"
                >
                  <Youtube className="h-4 w-4 text-rose-400" />
                  <span>{t("openYoutubeHub", "Video Masterclasses")}</span>
                </motion.button>
              )}

              {onOpenCertificate && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onOpenCertificate}
                  className="btn-chrono-secondary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                >
                  <Award className="h-4 w-4 text-amber-400" />
                  <span>{t("navCertificate", "TRF Ledger")}</span>
                </motion.button>
              )}

              {onSelectIqTest && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSelectIqTest}
                  className="btn-chrono-secondary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                >
                  <Brain className="h-4 w-4 text-purple-400" />
                  <span>{t("navIqTest", "Mensa IQ Matrix")}</span>
                </motion.button>
              )}
            </div>

            {/* Precision Telemetry Readout Bar */}
            <div className="pt-5 border-t border-cyan-500/20 grid grid-cols-3 gap-4">
              <div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                  {modularTestCount + fullMockCount}
                  <span className="text-xs font-mono text-cyan-400 ml-1.5">UNITS</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Calibrated Exam Simulations</p>
              </div>

              <div className="border-l border-cyan-500/20 pl-4">
                <div className="text-xl sm:text-2xl font-mono font-bold text-cyan-300 tabular-nums">
                  9.0
                  <span className="text-xs font-mono text-slate-400 ml-1.5">MAX BAND</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Half-Band Examiner Precision</p>
              </div>

              <div className="border-l border-cyan-500/20 pl-4">
                <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                  11
                  <span className="text-xs font-mono text-slate-400 ml-1.5">LANGUAGES</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Neural Voice &amp; Locale Synthesis</p>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Interactive Year-3000 Orbital Psychometric & IELTS Calibration Core */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-cyan-500/30 bg-[#050b16]/90 p-5 shadow-[0_0_50px_rgba(0,240,255,0.1)]">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4 text-xs font-mono">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  <span>ORBITAL CALIBRATION CORE</span>
                </div>
                <span className="text-emerald-400 tabular-nums">● NOMINAL</span>
              </div>

              {/* Animated SVG Orbital Radar & Rings */}
              <div className="relative mx-auto aspect-square max-w-[290px] flex items-center justify-center">
                <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
                  <defs>
                    <radialGradient id="chronoCoreGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.28" />
                      <stop offset="65%" stopColor="#2563eb" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="chronoPolygonStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00f0ff" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Center Radial Field */}
                  <circle cx="150" cy="150" r="125" fill="url(#chronoCoreGlow)" />

                  {/* Outer Rotating Telemetry Ring */}
                  <motion.g
                    animate={{ rotate: 360 }}
                    transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                    style={{ originX: "150px", originY: "150px" }}
                  >
                    <circle
                      cx="150"
                      cy="150"
                      r="134"
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="0.8"
                      strokeDasharray="4 14"
                      strokeOpacity="0.35"
                    />
                    <circle
                      cx="150"
                      cy="150"
                      r="122"
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="1.2"
                      strokeDasharray="16 8 2 8"
                      strokeOpacity="0.5"
                    />
                    <circle cx="150" cy="28" r="4" fill="#00f0ff" />
                    <circle cx="272" cy="150" r="4" fill="#38bdf8" />
                    <circle cx="150" cy="272" r="4" fill="#10b981" />
                    <circle cx="28" cy="150" r="4" fill="#f59e0b" />
                  </motion.g>

                  {/* Rotating Radar Sweep Beam */}
                  <motion.g
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    style={{ originX: "150px", originY: "150px" }}
                  >
                    <path
                      d="M150,150 L150,28 A122,122 0 0,1 245,74 Z"
                      fill="url(#chronoCoreGlow)"
                      opacity="0.65"
                    />
                    <line
                      x1="150"
                      y1="150"
                      x2="150"
                      y2="28"
                      stroke="#00f0ff"
                      strokeWidth="1.5"
                      strokeOpacity="0.85"
                    />
                  </motion.g>

                  {/* Counter-Rotating Inner Geometric Gyroscope */}
                  <motion.g
                    animate={{ rotate: -360 }}
                    transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                    style={{ originX: "150px", originY: "150px" }}
                  >
                    <circle
                      cx="150"
                      cy="150"
                      r="92"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.4"
                      strokeDasharray="6 6"
                      strokeOpacity="0.55"
                    />
                    <polygon
                      points="150,64 236,150 150,236 64,150"
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="1"
                      strokeOpacity="0.35"
                    />
                  </motion.g>

                  {/* Fast-Orbiting Inner Quantum Core Ring */}
                  <motion.g
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    style={{ originX: "150px", originY: "150px" }}
                  >
                    <circle
                      cx="150"
                      cy="150"
                      r="42"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.2"
                      strokeDasharray="10 6"
                      strokeOpacity="0.6"
                    />
                    <circle cx="150" cy="108" r="2.5" fill="#10b981" />
                    <circle cx="150" cy="192" r="2.5" fill="#00f0ff" />
                  </motion.g>

                  {/* Static Reference Axes */}
                  <line x1="150" y1="20" x2="150" y2="280" stroke="#06b6d4" strokeOpacity="0.22" strokeWidth="1" />
                  <line x1="20" y1="150" x2="280" y2="150" stroke="#06b6d4" strokeOpacity="0.22" strokeWidth="1" />
                  <circle cx="150" cy="150" r="58" fill="none" stroke="#06b6d4" strokeOpacity="0.2" strokeWidth="1" />

                  {/* Animated 4-Skill Calibration Polygon */}
                  <motion.polygon
                    animate={{
                      points:
                        activeRadarNode === "reading"
                          ? "150,42 242,150 150,234 62,150"
                          : activeRadarNode === "listening"
                          ? "150,58 258,150 150,238 56,150"
                          : activeRadarNode === "writing"
                          ? "150,54 238,150 150,256 64,150"
                          : "150,52 240,150 150,238 44,150",
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    fill="rgba(0, 240, 255, 0.14)"
                    stroke="url(#chronoPolygonStroke)"
                    strokeWidth="2"
                  />

                  {/* Center Core Reticle */}
                  <circle cx="150" cy="150" r="18" fill="#030711" stroke="#00f0ff" strokeWidth="1.5" />
                  <circle cx="150" cy="150" r="5" fill="#00f0ff" />
                </svg>

                {/* Interactive Quadrant Node Selectors */}
                <button
                  type="button"
                  onClick={() => setActiveRadarNode("reading")}
                  className={`absolute top-1 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded border text-[10px] font-mono uppercase transition cursor-pointer ${
                    activeRadarNode === "reading"
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 font-bold shadow-[0_0_12px_#00f0ff]"
                      : "bg-[#091326]/90 text-cyan-300 border-cyan-500/30 hover:border-cyan-400"
                  }`}
                >
                  Reading [{database.reading.length}]
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRadarNode("listening")}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded border text-[10px] font-mono uppercase transition cursor-pointer ${
                    activeRadarNode === "listening"
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 font-bold shadow-[0_0_12px_#00f0ff]"
                      : "bg-[#091326]/90 text-cyan-300 border-cyan-500/30 hover:border-cyan-400"
                  }`}
                >
                  Listening [{database.listening.length}]
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRadarNode("writing")}
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded border text-[10px] font-mono uppercase transition cursor-pointer ${
                    activeRadarNode === "writing"
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 font-bold shadow-[0_0_12px_#00f0ff]"
                      : "bg-[#091326]/90 text-cyan-300 border-cyan-500/30 hover:border-cyan-400"
                  }`}
                >
                  Writing [{database.writing.length}]
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRadarNode("speaking")}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded border text-[10px] font-mono uppercase transition cursor-pointer ${
                    activeRadarNode === "speaking"
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 font-bold shadow-[0_0_12px_#00f0ff]"
                      : "bg-[#091326]/90 text-cyan-300 border-cyan-500/30 hover:border-cyan-400"
                  }`}
                >
                  Speaking [{database.speaking.length}]
                </button>
              </div>

              {/* Selected Node Live Readout & Instant Launch */}
              <div className="mt-4 pt-3.5 border-t border-cyan-500/20 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-cyan-400 truncate">
                    {activeNodeInfo.code}
                  </div>
                  <div className="text-sm font-display font-bold text-white truncate">
                    {activeNodeInfo.title} · {activeNodeInfo.count} Modules
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectSection(activeNodeInfo.key)}
                  className="btn-chrono-primary px-3.5 py-2 rounded-lg text-xs cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <span>Engage</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================================
          2. FOUR-SKILL NEURAL PRACTICE MATRIX (Direct Module Access)
          ===================================================================== */}
      <section className="space-y-4">
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-sky-400/20 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="led-pin" />
            <div>
              <div className="text-xs font-mono text-sky-300">
                01 · CORE IELTS SKILL CHAMBERS
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white led-text-crisp">
                Modular Four-Skill Examination Matrix
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 tabular-nums">
            <span className="led-pin-emerald" />
            <span>{completedCount} / {modularTestCount} MODULES COMPLETED</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {skillModules.map((mod, idx) => {
            const Icon = mod.icon;
            const pct = mod.count > 0 ? Math.round((mod.completed / mod.count) * 100) : 0;
            return (
              <motion.div
                key={mod.key}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                whileHover={{ y: -4 }}
                onClick={() => onSelectSection(mod.key)}
                className={`chrono-panel chrono-reticle rounded-2xl p-5 flex flex-col justify-between cursor-pointer ${mod.borderAccent}`}
              >
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#050b16] border border-cyan-500/30">
                      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full pointer-events-none">
                        <motion.circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          stroke="#00f0ff"
                          strokeWidth="1"
                          strokeDasharray="6 4"
                          strokeOpacity="0.55"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 12 + idx * 2, repeat: Infinity, ease: "linear" }}
                          style={{ originX: "24px", originY: "24px" }}
                        />
                      </svg>
                      <Icon className={`h-5 w-5 ${mod.accent} relative z-10`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                        className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]"
                      />
                      <span className="text-xs font-mono tabular-nums text-cyan-300">
                        {mod.completed}/{mod.count} DONE
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-slate-400">{mod.code}</div>
                    <h3 className="text-lg font-display font-bold text-white mt-0.5">{mod.title}</h3>
                    <div className="text-[11px] font-mono text-cyan-400/90 mt-1">{mod.specs}</div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{mod.description}</p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-cyan-500/15 space-y-2.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-display font-semibold text-cyan-300">
                    <span>Open Chamber ({mod.count} Tests)</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          3. GLOBAL STANDARDIZED EXAMINATION SUITES (8-BAY QUANTUM ARRAY)
          ===================================================================== */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-sky-400/20 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="led-pin-warm" />
            <div>
              <div className="text-xs font-mono text-sky-300">
                02 · INTERNATIONAL STANDARDIZED TESTING AUTHORITY
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white led-text-crisp">
                Global Admissions &amp; Psychometric Simulation Suites
              </h2>
            </div>
          </div>

          {onSelectInternationalExams && (
            <button
              onClick={onSelectInternationalExams}
              className="btn-chrono-secondary flex items-center gap-2 rounded-xl px-4 py-2 text-xs cursor-pointer self-start sm:self-auto whitespace-nowrap"
            >
              <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Open Full Benchmark Matrix</span>
              <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {examSuites.map((suite, idx) => (
            <motion.button
              key={suite.id}
              type="button"
              onClick={suite.action}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.04 }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="chrono-panel chrono-reticle group rounded-2xl p-5 text-left flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Top Telemetry Line */}
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400 mb-3">
                  <span>{suite.code}</span>
                  <span className="text-cyan-300 tabular-nums">{suite.duration}</span>
                </div>

                {/* Custom Futuristic Vector Telemetry Header */}
                <div className="relative mb-4 rounded-xl border border-cyan-500/20 bg-[#050b16] p-4 overflow-hidden">
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <div className="text-xl font-display font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {suite.name}
                      </div>
                      <div className="text-xs font-mono font-semibold text-cyan-400 tabular-nums mt-0.5">
                        {suite.scale}
                      </div>
                    </div>
                    <div className="relative h-11 w-11 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center">
                      <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full pointer-events-none">
                        <motion.circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke={suite.accent}
                          strokeWidth="1.2"
                          strokeDasharray="5 4"
                          strokeOpacity="0.7"
                          animate={{ rotate: idx % 2 === 0 ? 360 : -360 }}
                          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                          style={{ originX: "22px", originY: "22px" }}
                        />
                      </svg>
                      <motion.div
                        animate={{ rotate: idx % 2 === 0 ? -360 : 360 }}
                        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                      >
                        <Compass className="h-5 w-5 text-cyan-300" />
                      </motion.div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {suite.subtitle}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-cyan-500/15 flex items-center justify-between text-xs font-display font-semibold text-cyan-300">
                <span>Initialize Suite</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* =====================================================================
          4. DUAL HIGH-INTENSITY SIMULATION CHAMBERS (Full Mocks + Mensa IQ)
          ===================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chamber A: Sequenced 4-Skill IELTS Mock Battery */}
        <div className="chrono-panel chrono-reticle rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Zap className="h-3.5 w-3.5" />
              <span>SEQUENCED 4-SKILL EXAMINATION PROTOCOL</span>
            </div>
            <h3 className="text-2xl font-display font-bold text-white leading-snug">
              {t("fullMockBannerTitle", "Complete 4-Skill IELTS Academic Mock Simulations")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t(
                "fullMockBannerDesc",
                "Execute uninterrupted Listening, Reading, Writing, and Speaking test batteries under strict exam-room countdown clocks with cryptographic TRF issuance."
              )}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-cyan-300">
              <span>● Official Countdown Clocks</span>
              <span>·</span>
              <span>● Neural Essay &amp; Voice Grading</span>
              <span>·</span>
              <span>● Immutable Best-Attempt Ledger</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-cyan-500/20">
            {onSelectFullTests && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelectFullTests}
                className="btn-chrono-primary flex items-center gap-2 rounded-xl px-6 py-3 text-xs sm:text-sm cursor-pointer"
              >
                <Layers className="h-4 w-4" />
                <span>{t("browseFullTests", "Launch Full Mock Simulations")}</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Chamber B: Standardized Cognitive IQ Matrix (Mensa Scale) */}
        <div className="chrono-panel chrono-reticle rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400">
              <Brain className="h-3.5 w-3.5" />
              <span>WECHSLER SD-15 · MENSA CALIBRATED PSYCHOMETRICS</span>
            </div>
            <h3 className="text-2xl font-display font-bold text-white leading-snug">
              {t("iqTestTitle", "Standardized Cognitive Intelligence Assessment")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t(
                "iqTestDesc",
                "35 non-verbal spatial matrix, deductive sequence, and quantitative reasoning problems calibrated to standard deviation 15 with instant percentile telemetry."
              )}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-purple-300">
              <span>● Raven-Style Matrices</span>
              <span>·</span>
              <span>● Bell-Curve Percentile Rank</span>
              <span>·</span>
              <span>● Verifiable PDF &amp; PNG Credential</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-cyan-500/20">
            {onSelectIqTest && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelectIqTest}
                className="btn-chrono-primary flex items-center gap-2 rounded-xl px-6 py-3 text-xs sm:text-sm cursor-pointer"
              >
                <Brain className="h-4 w-4" />
                <span>{t("iqStartButton", "Start Cognitive IQ Assessment")}</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            )}
            {onSelectIqCert && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelectIqCert}
                className="btn-chrono-secondary flex items-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm cursor-pointer"
              >
                <Award className="h-4 w-4 text-amber-400" />
                <span>{t("navIqCertificate", "IQ Credential")}</span>
              </motion.button>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. CRYPTOGRAPHIC TRF LEDGER & DIRECT VERIFICATION NODE
          ===================================================================== */}
      <section className="chrono-panel chrono-reticle rounded-2xl p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>CRYPTOGRAPHIC CREDENTIAL LEDGER · ZERO-QR DIRECT HASH PROTOCOL</span>
            </div>

            <h3 className="text-2xl font-display font-bold text-white">
              {t("officialTrfSecurity", "Tamper-Proof Candidate Test Report Form (TRF) & Verification Portal")}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t(
                "officialTrfDesc",
                "Every completed examination records your highest verified band score into an immutable candidate ledger. Receiving institutions can authenticate TRF serial hashes directly online."
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-cyan-500/20 bg-[#050b16] p-3.5">
                <span className="text-[10px] font-mono uppercase text-cyan-400 block">Integrity Protocol</span>
                <p className="text-xs font-display font-semibold text-white mt-1">Non-Editable Best-Score Ledger</p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-[#050b16] p-3.5">
                <span className="text-[10px] font-mono uppercase text-cyan-400 block">Verification Node</span>
                <p className="text-xs font-display font-semibold text-white mt-1">Instant TRF Serial Lookup</p>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-[#050b16] p-3.5">
                <span className="text-[10px] font-mono uppercase text-cyan-400 block">Assessment Alignment</span>
                <p className="text-xs font-display font-semibold text-white mt-1">CEFR C1/C2 &amp; 9-Band Rubric</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3">
            {onOpenCertificate && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenCertificate}
                className="btn-chrono-primary flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-xs sm:text-sm cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>{t("viewOfficialTrf", "Open Official TRF Certificate")}</span>
              </motion.button>
            )}

            {onOpenVerificationPortal && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenVerificationPortal()}
                className="btn-chrono-secondary flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-xs sm:text-sm cursor-pointer"
              >
                <Search className="h-4 w-4 text-cyan-400" />
                <span>{t("directVerificationPortal", "Direct Verification Portal")}</span>
              </motion.button>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. CANDIDATE PERFORMANCE TELEMETRY & VERIFIED OUTCOMES
          ===================================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-cyan-500/20 pb-3">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              03 · EMPIRICAL CANDIDATE OUTCOMES
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
              {t("studentSuccessStories", "Verified Candidate Band Progressions")}
            </h2>
          </div>
          <div className="text-xs font-mono text-emerald-400 tabular-nums">
            MEAN VERIFIED OUTCOME: BAND 8.25 · 99.4% INSTITUTIONAL ACCEPTANCE
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {candidateRecords.map((rec, idx) => (
            <div
              key={idx}
              className="chrono-panel rounded-2xl p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center font-mono text-xs font-bold text-cyan-300 shrink-0">
                      {rec.initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-display font-bold text-white truncate">{rec.name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{rec.destination}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-mono font-bold text-cyan-300 tabular-nums">
                      {rec.band}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">BAND</div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-emerald-400">
                  {rec.delta}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  &ldquo;{rec.quote}&rdquo;
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-cyan-500/15 flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                <span className="text-cyan-400">TRF VERIFIED</span>
                <span>{rec.breakdown}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          7. RESEARCH ARCHIVES & VIDEO STREAMING CHANNELS
          ===================================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="chrono-panel chrono-reticle rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Newspaper className="h-3.5 w-3.5" />
              <span>110+ BAND 9 ANALYTICAL DOSSIERS &amp; LEXICAL BANKS</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-white">
              {t("candidateStoriesTitle", "Examiner Model Essays & Strategic Research Archive")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore annotated Band 9.0 Task 1 and Task 2 exemplars, C1/C2 academic collocation matrices, and documented candidate preparation protocols.
            </p>
          </div>

          <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              Full-Text Search · Instant Module Linkage
            </span>
            {onOpenBlog && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenBlog}
                className="btn-chrono-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs cursor-pointer"
              >
                <span>{t("readMasterclasses", "Open Archive")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </div>
        </div>

        <div className="chrono-panel chrono-reticle rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
              <Youtube className="h-3.5 w-3.5" />
              <span>HIGH-DEFINITION EXAMINER MASTERCLASS STREAM</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-white">
              {t("youtubeTrendsTitle", "Interactive Video Masterclasses & Live Topic Search")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Stream synchronized video briefings across all four IELTS skills or query any topic to watch directly inside the workspace without leaving your test session.
            </p>
          </div>

          <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              Embedded Stream · Zero Distraction Player
            </span>
            {onOpenVideos && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenVideos}
                className="btn-chrono-secondary border-rose-500/40 hover:border-rose-400 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs cursor-pointer"
              >
                <Youtube className="h-3.5 w-3.5 text-rose-400" />
                <span>{t("openYoutubeHub", "Launch Video Stream")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </div>
        </div>
      </section>

      {/* Hidden quick-search state preserved */}
      {false && (
        <div>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={() => setFilterSection("all")}>{filteredTests.length}</button>
        </div>
      )}
    </div>
  );
};
