import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TestSection } from "../types/ielts";
import { stopAllActiveMedia } from "../utils/audioControl";
import { LingofiLogo } from "./LingofiLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  LayoutDashboard,
  Award,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Layers,
  X,
  ArrowLeft,
  GraduationCap,
  ChevronRight,
  Youtube,
  Newspaper,
  Brain,
  Globe2,
  User,
  Cpu
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

export type NavTab =
  | "dashboard"
  | TestSection
  | "guide"
  | "certificate"
  | "fulltests"
  | "verify"
  | "blog"
  | "videos"
  | "iqtest"
  | "iqcert"
  | "international-exams"
  | "pte"
  | "sat"
  | "gre"
  | "gmat"
  | "toefl"
  | "act"
  | "database-studio"
  | "director-leads";

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  completedCount: number;
  totalTests: number;
  fullMockCount?: number;
  sectionCounts?: { reading: number; listening: number; writing: number; speaking: number };
  onResetProgress: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  completedCount,
  totalTests,
  fullMockCount = 0,
  sectionCounts = { reading: 0, listening: 0, writing: 0, speaking: 0 },
  onResetProgress,
  onBack,
  canGoBack = false,
}) => {
  const { t } = useLanguage();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const percent = Math.round((completedCount / Math.max(totalTests, 1)) * 100) || 0;

  const handleNavClick = (tab: NavTab) => {
    stopAllActiveMedia();
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  const examTabs: { id: NavTab; label: string }[] = [
    { id: "dashboard", label: "Command" },
    { id: "fulltests", label: "IELTS" },
    { id: "pte", label: "PTE" },
    { id: "gre", label: "GRE" },
    { id: "gmat", label: "GMAT" },
    { id: "toefl", label: "TOEFL" },
    { id: "sat", label: "SAT" },
    { id: "act", label: "ACT" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-sky-400/25 bg-[#040914]/92 backdrop-blur-xl shadow-[0_10px_36px_rgba(0,0,0,0.75),inset_0_-1px_0_rgba(186,230,253,0.18)]">
      {/* Subtle Architectural Micro-LED Top Accent Pins */}
      <div className="pointer-events-none mx-auto flex max-w-7xl items-center justify-between px-6">
        <span className="led-pin-dim" />
        <span className="led-pin" />
        <span className="led-pin-dim" />
        <span className="led-pin-emerald" />
        <span className="led-pin-dim" />
      </div>
      <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick("dashboard")}
            className="shrink-0 rounded-xl p-0.5 transition cursor-pointer focus:outline-none"
            aria-label="Go to LingoFi Command Deck"
          >
            <LingofiLogo size="sm" variant="white" />
          </button>

          {/* Zone 2: Clean Futuristic Navigation Links with Animated Active Line */}
          <nav
            className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none"
            aria-label="Examination Suites"
          >
            {examTabs.map((exam) => {
              const active =
                exam.id === "fulltests"
                  ? ["reading", "listening", "writing", "speaking", "fulltests", "guide"].includes(currentTab)
                  : currentTab === exam.id;
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => handleNavClick(exam.id)}
                  className={`relative shrink-0 px-3 py-1.5 text-xs font-display font-semibold tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                    active ? "text-cyan-300" : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  <span>{exam.label}</span>
                  {active && (
                    <motion.span
                      layoutId="chronoActiveNavUnderline"
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                      className="absolute inset-x-1.5 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-[#00f0ff] to-blue-500 shadow-[0_0_10px_#00f0ff]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Controls */}
          <div className="flex shrink-0 items-center gap-2">
            {canGoBack && onBack && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onBack}
                aria-label="Go back"
                title={t("backToHub", "Back")}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-2.5 text-xs font-display font-semibold text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400 transition cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden md:inline">Return</span>
              </motion.button>
            )}

            <LanguageSwitcher compact variant="dark" />

            {/* Matrix Portal Trigger */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Open Navigation Matrix"
              className="flex h-9 items-center gap-2 rounded-lg border border-cyan-500/35 bg-[#091326] hover:bg-cyan-950/50 hover:border-cyan-400 px-3 text-xs font-display font-semibold text-cyan-200 transition cursor-pointer whitespace-nowrap"
            >
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">
                {isMobileMenuOpen ? t("closeHub", "Close Matrix") : t("menuHub", "System Matrix")}
              </span>
            </motion.button>

            {/* Candidate / Staff Account Action */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 rounded-lg bg-[#091326] border border-cyan-500/30 px-2.5 py-1.5 text-slate-100">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-400/20 border border-cyan-400/40 text-[11px] font-mono font-bold text-cyan-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:inline text-xs font-medium max-w-[100px] truncate text-slate-200">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  className="text-[11px] font-mono text-slate-400 hover:text-rose-400 transition cursor-pointer whitespace-nowrap"
                >
                  Exit
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openAuthModal("login")}
                className="btn-chrono-primary flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs cursor-pointer whitespace-nowrap"
                title="Candidate & Staff Portal"
              >
                <User className="h-3.5 w-3.5" />
                <span>Access Portal</span>
              </motion.button>
            )}

            {user?.role === "admin" && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick("database-studio")}
                  className="hidden lg:inline-flex h-9 items-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2.5 text-xs font-mono font-semibold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer whitespace-nowrap"
                >
                  Director
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick("director-leads")}
                  className="hidden xl:inline-flex h-9 items-center rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2.5 text-xs font-mono font-semibold text-cyan-300 hover:bg-cyan-500/20 cursor-pointer whitespace-nowrap"
                >
                  Leads
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FULL-SCREEN QUANTUM NAVIGATION MATRIX OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[100] w-screen h-screen bg-[#030711]/98 backdrop-blur-2xl flex flex-col justify-between overflow-hidden chrono-canvas-bg"
          >
            {/* Matrix Overlay Top Bar */}
            <div className="flex items-center justify-between border-b border-cyan-500/25 bg-[#070f1f]/90 px-4 sm:px-8 py-4">
              <div className="flex items-center gap-3">
                <LingofiLogo size="md" variant="white" />
                <span className="hidden sm:inline-block text-xs font-mono text-cyan-400/80 border-l border-cyan-500/25 pl-3">
                  Quantum Navigation Matrix · {fullMockCount} Full Mocks · {totalTests} Modules
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.06, rotate: 90 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close navigation matrix"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1528] text-cyan-300 hover:bg-cyan-950/60 border border-cyan-500/35 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Matrix Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-7 max-w-5xl mx-auto w-full">
              {canGoBack && onBack && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onBack();
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-cyan-950/40 border border-cyan-400/40 text-cyan-200 font-display font-semibold text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ArrowLeft className="h-4 w-4 text-cyan-400" />
                    <span>{t("backToHub", "Return to Active Workspace / Catalog")}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-cyan-400" />
                </motion.button>
              )}

              {/* 01. Core Neural Examination Modules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs font-mono text-cyan-400">
                  <span>01. Core IELTS Neural Modules</span>
                  <span className="tabular-nums text-slate-400">{fullMockCount} Full Simulations</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      id: "dashboard" as NavTab,
                      title: t("navDashboard", "Command Deck Overview"),
                      meta: "Telemetry · All Suites · Progress",
                      icon: LayoutDashboard,
                      accent: "text-cyan-400",
                    },
                    {
                      id: "fulltests" as NavTab,
                      title: t("navFullTests", "Full 4-Skill Mock Battery"),
                      meta: `${fullMockCount} Timed Simulations · Scored`,
                      icon: Layers,
                      accent: "text-amber-400",
                    },
                    {
                      id: "reading" as NavTab,
                      title: t("navReading", "Academic Reading Matrix"),
                      meta: `${sectionCounts.reading} Tests · 60m · 40 Qs`,
                      icon: BookOpen,
                      accent: "text-blue-400",
                    },
                    {
                      id: "listening" as NavTab,
                      title: t("navListening", "Acoustic Listening Lab"),
                      meta: `${sectionCounts.listening} Tests · 40m · 4 Parts`,
                      icon: Headphones,
                      accent: "text-cyan-400",
                    },
                    {
                      id: "writing" as NavTab,
                      title: t("navWriting", "Neural Writing Evaluator"),
                      meta: `${sectionCounts.writing} Tests · Tasks 1 & 2`,
                      icon: PenTool,
                      accent: "text-amber-400",
                    },
                    {
                      id: "speaking" as NavTab,
                      title: t("navSpeaking", "Biometric Speaking Studio"),
                      meta: `${sectionCounts.speaking} Tests · Parts 1–3`,
                      icon: Mic,
                      accent: "text-emerald-400",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = currentTab === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNavClick(item.id)}
                        className={`flex items-center justify-between p-4 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? "bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                            : "bg-[#091326]/90 border-cyan-500/20 text-slate-200 hover:border-cyan-400/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#050b16] border border-cyan-500/25">
                            <Icon className={`h-4 w-4 ${item.accent}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-display font-bold text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-cyan-400 shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 02. Global Standardized Testing Suites */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs font-mono text-cyan-400">
                  <span>02. Global Standardized Testing Suites</span>
                  <button
                    onClick={() => handleNavClick("international-exams")}
                    className="text-cyan-300 hover:underline cursor-pointer"
                  >
                    Open Full Matrix →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {[
                    { id: "pte" as NavTab, name: "PTE Academic", scale: "10–90 Scale", org: "Pearson" },
                    { id: "sat" as NavTab, name: "Digital SAT", scale: "400–1600", org: "College Board" },
                    { id: "gre" as NavTab, name: "GRE General", scale: "260–340", org: "ETS" },
                    { id: "gmat" as NavTab, name: "GMAT Focus", scale: "205–805", org: "GMAC" },
                    { id: "toefl" as NavTab, name: "TOEFL iBT", scale: "0–120 Scale", org: "ETS" },
                    { id: "act" as NavTab, name: "ACT Suite", scale: "1–36 Scale", org: "ACT Inc." },
                  ].map((suite) => (
                    <motion.button
                      key={suite.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavClick(suite.id)}
                      className="flex flex-col justify-between p-3.5 rounded-xl border border-cyan-500/20 bg-[#091326]/90 text-left hover:border-cyan-400 transition cursor-pointer"
                    >
                      <div>
                        <div className="text-[10px] font-mono text-cyan-400">{suite.org}</div>
                        <div className="text-xs font-display font-bold text-white mt-1">{suite.name}</div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">{suite.scale}</div>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300 mt-3">Initialize →</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* 03. Psychometrics, Cryptographic Credentials & Knowledge Archives */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs font-mono text-cyan-400">
                  <span>03. Cognitive Psychometrics, Credentials &amp; Archives</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      id: "iqtest" as NavTab,
                      title: t("navIqTest", "Mensa Cognitive IQ Matrix"),
                      meta: "SD 15 Calibration · 35 Items",
                      icon: Brain,
                    },
                    {
                      id: "certificate" as NavTab,
                      title: t("navCertificate", "Cryptographic TRF Ledger"),
                      meta: "Official Band Record",
                      icon: Award,
                    },
                    {
                      id: "verify" as NavTab,
                      title: t("navVerify", "Direct Verification Node"),
                      meta: "Instant Hash Lookup",
                      icon: ShieldCheck,
                    },
                    {
                      id: "videos" as NavTab,
                      title: t("navVideos", "Video Masterclass Stream"),
                      meta: "Examiner Briefings",
                      icon: Youtube,
                    },
                    {
                      id: "blog" as NavTab,
                      title: t("navBlog", "Band 9 Research Archive"),
                      meta: "110+ Analytical Dossiers",
                      icon: Newspaper,
                    },
                    {
                      id: "guide" as NavTab,
                      title: t("navGuide", "Rubric & Protocol Specs"),
                      meta: "Scoring Architecture",
                      icon: GraduationCap,
                    },
                    {
                      id: "iqcert" as NavTab,
                      title: t("navIqCertificate", "Cognitive IQ Credential"),
                      meta: "Psychometric Certificate",
                      icon: Sparkles,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNavClick(item.id)}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-cyan-500/20 bg-[#091326]/90 text-left hover:border-cyan-400 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-display font-bold text-white truncate">{item.title}</div>
                            <div className="text-[11px] font-mono text-slate-400 truncate">{item.meta}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Matrix Footer */}
            <div className="border-t border-cyan-500/20 bg-[#070f1f] px-4 sm:px-8 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-28 sm:w-40 overflow-hidden rounded-full bg-slate-900 border border-cyan-500/30">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-300">
                  {completedCount} / {totalTests} Completed ({percent}%)
                </span>
              </div>

              {completedCount > 0 && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onResetProgress();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-xs font-mono text-rose-300 hover:bg-rose-900/50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t("resetProgress", "Purge Progress")}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
