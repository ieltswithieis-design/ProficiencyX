import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TestSection, IeltsDatabase, FullIeltsTest } from "./types/ielts";
import { ieltsDatabase as defaultIeltsDatabase } from "./data/ieltsData";
import { fullIeltsTests as defaultFullTests } from "./data/fullTestsData";
import { loadProgress, ProgressState } from "./utils/storage";
import { Header, NavTab } from "./components/Header";
import { stopAllActiveMedia } from "./utils/audioControl";
import { calculateOverallBand } from "./utils/ieltsScoring";
import { Dashboard } from "./components/Dashboard";
import { SectionListView } from "./components/SectionListView";
import { ReadingRunner } from "./components/ReadingRunner";
import { ListeningRunner } from "./components/ListeningRunner";
import { WritingRunner } from "./components/WritingRunner";
import { SpeakingRunner } from "./components/SpeakingRunner";
import { FormatGuide } from "./components/FormatGuide";
import { CertificateTRF } from "./components/CertificateTRF";
import { FullTestListView } from "./components/FullTestListView";
import { FullTestRunner } from "./components/FullTestRunner";
import { CertificateVerificationPortal } from "./components/CertificateVerificationPortal";
import { BlogStoriesView } from "./components/BlogStoriesView";
import { IeltsVideoHub } from "./components/IeltsVideoHub";
import { IqTestRunner } from "./components/IqTestRunner";
import { IqCertificate } from "./components/IqCertificate";
import { IqScoreBreakdown } from "./types/iq";
import { useLanguage } from "./context/LanguageContext";
import { useAuth } from "./context/AuthContext";
import {
  loadDatabaseFromBackend,
  loadFullTestsFromBackend,
  recordTestSubmission,
  loadStandardizedDatabase,
} from "./services/databaseService";
import { DirectorDatabaseStudio } from "./components/DirectorDatabaseStudio";
import { DirectorLeadsStudio } from "./components/DirectorLeadsStudio";
import { AuthModal } from "./components/AuthModal";
import { StandardizedExamsHub } from "./components/StandardizedExamsHub";
import { StandardizedTestRunner } from "./components/StandardizedTestRunner";
import { PteAcademicHub } from "./components/PteAcademicHub";
import { StandardizedScoreReport } from "./components/StandardizedScoreReport";
import { StandardizedExamId, StandardizedTestResult, StandardizedDatabase } from "./types/standardizedTests";
import { STANDARDIZED_EXAMS_META, STANDARDIZED_TEST_PACKAGES } from "./data/standardizedTestsData";

export default function App() {
  const { t, isRTL } = useLanguage();
  const { user, isAuthenticated, requireSignup, isAuthModalRequired } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [activeTest, setActiveTest] = useState<{ section: TestSection; id: number } | null>(null);
  const [activeFullTest, setActiveFullTest] = useState<FullIeltsTest | null>(null);
  const [activeStandardizedExam, setActiveStandardizedExam] = useState<StandardizedExamId | null>(null);
  const [activeStandardizedPackageId, setActiveStandardizedPackageId] = useState<string | null>(null);
  const [standardizedResult, setStandardizedResult] = useState<StandardizedTestResult | null>(null);
  const [standardizedDatabase, setStandardizedDatabase] = useState<StandardizedDatabase | null>(null);
  const [verificationTrfCode, setVerificationTrfCode] = useState<string>("");
  const [progress, setProgress] = useState<ProgressState>({ completed: {}, attempts: {} });
  const [iqScoreData, setIqScoreData] = useState<IqScoreBreakdown | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);

  const [database, setDatabase] = useState<IeltsDatabase>(defaultIeltsDatabase);
  const [fullTests, setFullTests] = useState<FullIeltsTest[]>(defaultFullTests);

  const refreshDatabase = async () => {
    try {
      const [db, ft, standardized] = await Promise.all([
        loadDatabaseFromBackend(),
        loadFullTestsFromBackend(),
        loadStandardizedDatabase().catch(() => null),
      ]);
      setDatabase(db);
      setFullTests(ft);
      if (standardized) setStandardizedDatabase(standardized);
    } catch (err) {
      console.warn("Using offline bundled database:", err);
    }
  };

  useEffect(() => {
    setProgress(loadProgress());
    refreshDatabase();
  }, []);

  useEffect(() => {
    const timerKey = "lingofi_site_access_started_at";

    if (isAuthenticated) {
      sessionStorage.removeItem(timerKey);
      return;
    }

    let startedAt = Number(sessionStorage.getItem(timerKey) || 0);
    if (!startedAt || !Number.isFinite(startedAt)) {
      startedAt = Date.now();
      sessionStorage.setItem(timerKey, String(startedAt));
    }

    const checkLimit = () => {
      if (!isAuthenticated && Date.now() - startedAt >= 40 * 1000) {
        requireSignup();
      }
    };

    checkLimit();
    const interval = window.setInterval(checkLimit, 1000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, requireSignup]);

  useEffect(() => {
    if ((currentTab === "database-studio" || currentTab === "director-leads") && user?.role !== "admin") {
      setCurrentTab("dashboard");
      stopAllActiveMedia();
    }
  }, [currentTab, user?.role]);

  useEffect(() => {
    stopAllActiveMedia();
  }, [currentTab]);

  const handleRefreshProgress = () => {
    setProgress(loadProgress());
  };

  const handleSelectTest = (section: TestSection, id: number) => {
    stopAllActiveMedia();
    setActiveFullTest(null);
    setActiveStandardizedExam(null);
    setStandardizedResult(null);
    setActiveTest({ section, id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectFullTest = (fullTest: FullIeltsTest) => {
    stopAllActiveMedia();
    setActiveTest(null);
    setActiveStandardizedExam(null);
    setStandardizedResult(null);
    setActiveFullTest(fullTest);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectStandardizedExam = (examId: StandardizedExamId, packageId?: string) => {
    stopAllActiveMedia();
    setActiveTest(null);
    setActiveFullTest(null);
    setStandardizedResult(null);
    setActiveStandardizedPackageId(packageId || null);
    if (!packageId && ["pte", "sat", "gre", "gmat", "toefl", "act"].includes(examId)) {
      setActiveStandardizedExam(null);
      setCurrentTab(examId as NavTab);
    } else {
      setActiveStandardizedExam(examId);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToCatalog = () => {
    stopAllActiveMedia();
    setActiveTest(null);
    setActiveFullTest(null);
    setActiveStandardizedExam(null);
    setActiveStandardizedPackageId(null);
    setStandardizedResult(null);
    handleRefreshProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenCertificate = () => {
    stopAllActiveMedia();
    handleRefreshProgress();
    setActiveTest(null);
    setActiveFullTest(null);
    setActiveStandardizedExam(null);
    setStandardizedResult(null);
    setCurrentTab("certificate");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTestCompleteAndRedirectToTRF = () => {
    stopAllActiveMedia();
    const latestProgress = loadProgress();
    handleRefreshProgress();

    if (activeFullTest) {
      const sectionIds = {
        reading: activeFullTest.readingId,
        listening: activeFullTest.listeningId,
        writing: activeFullTest.writingId,
        speaking: activeFullTest.speakingId,
      };
      const scores = Object.fromEntries(
        (Object.keys(sectionIds) as Array<keyof typeof sectionIds>).map((section) => [
          section,
          Number(latestProgress.attempts[`${section}-${sectionIds[section]}`]?.band),
        ])
      ) as { reading: number; listening: number; writing: number; speaking: number };

      const allScoresPresent = Object.values(scores).every((score) => Number.isFinite(score));
      if (allScoresPresent) {
        const overall = Number(calculateOverallBand(Object.values(scores)));
        void recordTestSubmission({
          trfCode: `LING${Date.now().toString().slice(-10)}`,
          candidateName: user?.name || "Candidate",
          userEmail: user?.email || undefined,
          testId: activeFullTest.id,
          testTitle: activeFullTest.title,
          overallBand: overall,
          scores,
        });
      }
    }
    setActiveTest(null);
    setActiveFullTest(null);
    setCurrentTab("certificate");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenVerificationPortal = (trfCode?: string | unknown) => {
    stopAllActiveMedia();
    setActiveTest(null);
    setActiveFullTest(null);
    setActiveStandardizedExam(null);
    setStandardizedResult(null);
    if (typeof trfCode === "string" && trfCode.trim()) {
      setVerificationTrfCode(trfCode.trim());
    } else {
      setVerificationTrfCode("");
    }
    setCurrentTab("verify");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetAllProgress = () => {
    setShowResetConfirmModal(true);
  };

  const handleConfirmReset = () => {
    localStorage.removeItem("ielts_mastery_progress_v2");
    setProgress({ completed: {}, attempts: {} });
    setShowResetConfirmModal(false);
  };

  const handleNavigateFromContent = (section: TestSection | "fulltests", testId: number) => {
    if (section === "fulltests") {
      const ft = fullTests.find((tItem) => tItem.id === testId) || fullTests[0];
      handleSelectFullTest(ft);
    } else {
      handleSelectTest(section, testId);
    }
  };

  const totalModularTests =
    (database.reading?.length || 0) +
    (database.listening?.length || 0) +
    (database.writing?.length || 0) +
    (database.speaking?.length || 0);

  const completedCount = Object.keys(progress.completed).length;

  const canGoBack = Boolean(
    activeTest ||
      activeFullTest ||
      activeStandardizedExam ||
      standardizedResult ||
      currentTab !== "dashboard"
  );

  const handleUniversalBack = () => {
    stopAllActiveMedia();
    if (activeTest || activeFullTest || activeStandardizedExam || standardizedResult) {
      handleBackToCatalog();
    } else {
      setCurrentTab("dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "Escape" && canGoBack && !isInput && !isAuthModalRequired) {
        handleUniversalBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canGoBack,
    activeTest,
    activeFullTest,
    activeStandardizedExam,
    standardizedResult,
    currentTab,
    isAuthModalRequired,
  ]);

  const activeViewKey = activeFullTest
    ? `full-${activeFullTest.id}`
    : activeTest
    ? `${activeTest.section}-${activeTest.id}`
    : activeStandardizedExam
    ? `std-${activeStandardizedExam}-${activeStandardizedPackageId || "default"}`
    : standardizedResult
    ? "std-result"
    : currentTab;

  // Guarantee all speaking voices and audio stop whenever the active view changes
  useEffect(() => {
    stopAllActiveMedia();
  }, [activeViewKey]);

  return (
    <div
      className="min-h-screen chrono-canvas-bg text-slate-100 flex flex-col font-sans max-w-full overflow-x-hidden"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Orbital Command Deck Header */}
      <Header
        currentTab={
          activeFullTest
            ? "fulltests"
            : activeTest
            ? activeTest.section
            : activeStandardizedExam
            ? activeStandardizedExam
            : currentTab
        }
        onSelectTab={(tab) => {
          stopAllActiveMedia();
          setActiveTest(null);
          setActiveFullTest(null);
          setActiveStandardizedExam(null);
          setStandardizedResult(null);

          if (["pte", "sat", "gre", "gmat", "toefl", "act"].includes(tab)) {
            setActiveStandardizedExam(null);
            setActiveStandardizedPackageId(null);
            setCurrentTab(tab);
          } else {
            setCurrentTab(tab);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        completedCount={completedCount}
        totalTests={totalModularTests}
        fullMockCount={fullTests.length}
        sectionCounts={{
          reading: database.reading.length,
          listening: database.listening.length,
          writing: database.writing.length,
          speaking: database.speaking.length,
        }}
        onResetProgress={handleResetAllProgress}
        canGoBack={canGoBack}
        onBack={handleUniversalBack}
      />

      {/* Main Content Stage with Smooth Animated View Transitions */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-6 sm:py-8 max-w-full overflow-x-hidden">
        {(activeTest || activeFullTest || activeStandardizedExam || standardizedResult) && (
          <div className="sm:hidden mb-4 flex items-center justify-between rounded-xl border border-cyan-500/35 bg-[#091326] p-2.5">
            <button
              onClick={handleBackToCatalog}
              className="flex items-center gap-2 text-xs font-display font-bold text-cyan-300 cursor-pointer"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                ←
              </span>
              <span>{t("backToHub", "Return to Command Deck")}</span>
            </button>
            <span className="font-mono text-[10px] text-cyan-400 uppercase">
              {activeFullTest
                ? "Full Simulation"
                : activeStandardizedExam
                ? `${activeStandardizedExam.toUpperCase()} Suite`
                : `${activeTest?.section.toUpperCase()} #${activeTest?.id}`}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeViewKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {standardizedResult ? (
              <StandardizedScoreReport
                result={standardizedResult}
                onRetake={() => {
                  setActiveStandardizedExam(standardizedResult?.examId || "pte");
                  setStandardizedResult(null);
                }}
                onBackToHub={() => {
                  setStandardizedResult(null);
                  setActiveStandardizedExam(null);
                  setCurrentTab("international-exams");
                }}
              />
            ) : activeStandardizedExam ? (
              <StandardizedTestRunner
                key={activeStandardizedPackageId || activeStandardizedExam || "standardized-new"}
                testPackage={
                  (activeStandardizedPackageId &&
                    standardizedDatabase?.packages?.find((p) => p.id === activeStandardizedPackageId)) ||
                  (activeStandardizedExam &&
                    standardizedDatabase?.packages?.find(
                      (p) => p?.examId === activeStandardizedExam && p.published !== false
                    )) ||
                  (activeStandardizedPackageId &&
                    STANDARDIZED_TEST_PACKAGES.find((p) => p.id === activeStandardizedPackageId)) ||
                  (activeStandardizedExam &&
                    STANDARDIZED_TEST_PACKAGES.find((p) => p?.examId === activeStandardizedExam)) ||
                  STANDARDIZED_TEST_PACKAGES[0]
                }
                onBack={handleBackToCatalog}
                onCompleteTest={(res) => {
                  setStandardizedResult(res);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ) : activeFullTest ? (
              <FullTestRunner
                key={`full-${activeFullTest.id}`}
                test={activeFullTest}
                database={database}
                progress={progress}
                onBack={handleBackToCatalog}
                onComplete={handleRefreshProgress}
                onOpenCertificate={handleTestCompleteAndRedirectToTRF}
                onOpenVerificationPortal={handleOpenVerificationPortal}
              />
            ) : activeTest ? (
              <div>
                {activeTest.section === "reading" && (
                  <ReadingRunner
                    key={`reading-${activeTest.id}`}
                    test={database.reading.find((tItem) => tItem.id === activeTest.id) || database.reading[0]}
                    onBack={handleBackToCatalog}
                    onComplete={handleTestCompleteAndRedirectToTRF}
                  />
                )}

                {activeTest.section === "listening" && (
                  <ListeningRunner
                    key={`listening-${activeTest.id}`}
                    test={
                      database.listening.find((tItem) => tItem.id === activeTest.id) || database.listening[0]
                    }
                    onBack={handleBackToCatalog}
                    onComplete={handleTestCompleteAndRedirectToTRF}
                  />
                )}

                {activeTest.section === "writing" && (
                  <WritingRunner
                    key={`writing-${activeTest.id}`}
                    test={database.writing.find((tItem) => tItem.id === activeTest.id) || database.writing[0]}
                    onBack={handleBackToCatalog}
                    onComplete={handleTestCompleteAndRedirectToTRF}
                  />
                )}

                {activeTest.section === "speaking" && (
                  <SpeakingRunner
                    key={`speaking-${activeTest.id}`}
                    test={
                      database.speaking.find((tItem) => tItem.id === activeTest.id) || database.speaking[0]
                    }
                    onBack={handleBackToCatalog}
                    onComplete={handleTestCompleteAndRedirectToTRF}
                    onOpenCertificate={handleTestCompleteAndRedirectToTRF}
                  />
                )}
              </div>
            ) : (
              <div>
                {currentTab === "dashboard" && (
                  <Dashboard
                    database={database}
                    progress={progress}
                    onSelectTest={handleSelectTest}
                    fullMockCount={fullTests.length}
                    standardizedDatabase={standardizedDatabase}
                    sectionCounts={{
                      reading: database.reading.length,
                      listening: database.listening.length,
                      writing: database.writing.length,
                      speaking: database.speaking.length,
                    }}
                    onSelectSection={(sec) => {
                      setCurrentTab(sec);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onOpenCertificate={handleOpenCertificate}
                    onSelectFullTests={() => {
                      setCurrentTab("fulltests");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onOpenVerificationPortal={handleOpenVerificationPortal}
                    onOpenBlog={() => {
                      setCurrentTab("blog");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onOpenVideos={() => {
                      setCurrentTab("videos");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onSelectIqTest={() => {
                      setCurrentTab("iqtest");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onSelectIqCert={() => {
                      setCurrentTab("iqcert");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onSelectInternationalExams={() => {
                      setCurrentTab("international-exams");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onSelectIelts={() => {
                      setCurrentTab("fulltests");
                      setActiveStandardizedExam(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onSelectStandardizedTest={(examId, packageId) => {
                      handleSelectStandardizedExam(examId, packageId);
                    }}
                  />
                )}

                {currentTab === "database-studio" && user?.role === "admin" && (
                  <DirectorDatabaseStudio
                    onClose={() => {
                      setCurrentTab("dashboard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onImported={() => {
                      void refreshDatabase();
                    }}
                  />
                )}

                {currentTab === "director-leads" && user?.role === "admin" && (
                  <DirectorLeadsStudio
                    onClose={() => {
                      setCurrentTab("dashboard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}

                {["pte", "sat", "gre", "gmat", "toefl", "act"].includes(currentTab) && (
                  <PteAcademicHub
                    meta={
                      standardizedDatabase?.exams?.[currentTab as StandardizedExamId] ||
                      STANDARDIZED_EXAMS_META[currentTab as StandardizedExamId]
                    }
                    packages={(
                      standardizedDatabase?.packages || STANDARDIZED_TEST_PACKAGES
                    ).filter(
                      (p) => p?.examId === currentTab && p.published !== false
                    )}
                    onStart={(packageId) =>
                      handleSelectStandardizedExam(currentTab as StandardizedExamId, packageId)
                    }
                    onBack={() => setCurrentTab("international-exams")}
                  />
                )}

                {currentTab === "international-exams" && (
                  <StandardizedExamsHub
                    database={standardizedDatabase}
                    onSelectStandardizedTest={handleSelectStandardizedExam}
                    onSelectIelts={() => {
                      setCurrentTab("fulltests");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onSelectIqTest={() => {
                      setCurrentTab("iqtest");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}

                {currentTab === "blog" && <BlogStoriesView onNavigateToTest={handleNavigateFromContent} />}

                {currentTab === "videos" && (
                  <IeltsVideoHub onNavigateToTest={handleNavigateFromContent} />
                )}

                {currentTab === "fulltests" && (
                  <FullTestListView
                    progress={progress}
                    tests={fullTests}
                    onSelectFullTest={handleSelectFullTest}
                    onOpenCertificate={handleOpenCertificate}
                  />
                )}

                {(currentTab === "reading" ||
                  currentTab === "listening" ||
                  currentTab === "writing" ||
                  currentTab === "speaking") && (
                  <SectionListView
                    section={currentTab}
                    database={database}
                    progress={progress}
                    onSelectTest={handleSelectTest}
                  />
                )}

                {currentTab === "guide" && <FormatGuide />}

                {currentTab === "certificate" && (
                  <CertificateTRF
                    progress={progress}
                    onClose={() => {
                      setCurrentTab("dashboard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onOpenVerificationPortal={handleOpenVerificationPortal}
                    onNavigateToTest={(sec) => {
                      setCurrentTab(sec);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}

                {currentTab === "verify" && (
                  <CertificateVerificationPortal
                    initialTrfCode={verificationTrfCode}
                    onBackToApp={() => {
                      setCurrentTab("dashboard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onViewCertificate={() => {
                      setCurrentTab("certificate");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}

                {currentTab === "iqtest" && (
                  <IqTestRunner
                    onBack={() => {
                      setCurrentTab("dashboard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onOpenCertificate={(results) => {
                      setIqScoreData(results);
                      setCurrentTab("iqcert");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}

                {currentTab === "iqcert" && (
                  <IqCertificate
                    scoreData={iqScoreData || undefined}
                    onBack={() => {
                      setCurrentTab("iqtest");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onOpenVerificationPortal={handleOpenVerificationPortal}
                    onRetake={() => {
                      setCurrentTab("iqtest");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Candidate / Staff Auth Modal */}
      <AuthModal />

      {/* Architectural Micro-LED Illuminated Footer System */}
      <footer className="relative mt-16 overflow-hidden border-t border-sky-400/25 bg-gradient-to-b from-[#071022] via-[#040a17] to-[#02050d] pt-14 pb-12 text-slate-300 shadow-[0_-24px_64px_rgba(0,0,0,0.85)]">
        {/* Top Architectural Light Rail & Center Pin */}
        <div className="pointer-events-none absolute inset-x-0 top-0">
          <div className="led-rail-horizontal" />
          <div className="mx-auto flex max-w-6xl items-center justify-between px-8 -mt-[2px]">
            <span className="led-pin-dim" />
            <span className="led-pin" />
            <span className="led-pin-dim" />
            <span className="led-pin-warm" />
            <span className="led-pin" />
            <span className="led-pin-dim" />
            <span className="led-pin-emerald" />
            <span className="led-pin" />
            <span className="led-pin-dim" />
          </div>
        </div>

        {/* Subtle Ambient Architectural Backlighting (Controlled & Refined) */}
        <div className="pointer-events-none absolute -top-28 left-1/4 h-56 w-96 -translate-x-1/2 rounded-full bg-sky-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -top-24 right-1/4 h-56 w-96 translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-[38rem] -translate-x-1/2 rounded-full bg-blue-500/[0.05] blur-3xl" />

        {/* Distributed Miniature Embedded LED Points (Varied Intensity & Natural Positioning) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="led-pin absolute top-7 left-[8%]" />
          <span className="led-pin-dim absolute top-14 left-[18%]" />
          <span className="led-pin-warm absolute top-9 left-[33%]" />
          <span className="led-pin-dim absolute top-20 left-[48%]" />
          <span className="led-pin absolute top-8 left-[64%]" />
          <span className="led-pin-emerald absolute top-16 left-[79%]" />
          <span className="led-pin-dim absolute top-10 left-[91%]" />
          <span className="led-pin-dim absolute bottom-16 left-[12%]" />
          <span className="led-pin absolute bottom-10 left-[27%]" />
          <span className="led-pin-dim absolute bottom-20 left-[54%]" />
          <span className="led-pin-warm absolute bottom-12 left-[73%]" />
          <span className="led-pin absolute bottom-8 left-[88%]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 space-y-10">
          {/* Layered Architectural Footer Frame */}
          <div className="relative rounded-2xl border border-sky-400/20 bg-gradient-to-b from-[#0b162c]/90 to-[#060d1b]/95 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(224,242,254,0.18)] backdrop-blur-xl">
            {/* Corner Miniature LED Pins on the Layered Surface */}
            <span className="led-pin absolute top-2.5 left-2.5" />
            <span className="led-pin absolute top-2.5 right-2.5" />
            <span className="led-pin-dim absolute bottom-2.5 left-2.5" />
            <span className="led-pin-dim absolute bottom-2.5 right-2.5" />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              {/* Column 1: Brand Authority & Director Wasil Azad */}
              <div className="lg:col-span-4 space-y-3.5 text-left">
                <div className="flex items-center gap-2.5">
                  <span className="led-pin-emerald" />
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-sky-300 uppercase">
                    LingoFi Global Assessment Architecture
                  </span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight led-text-crisp">
                  International Standardized Testing &amp; Psychometric Authority
                </h3>
                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                  High-precision computer-delivered examination suites across IELTS Academic, PTE, GRE, GMAT, TOEFL, Digital SAT, ACT, and Mensa SD-15 Psychometrics.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-sky-200">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-sky-400/25 bg-[#050b16]/90 px-3 py-1.5 text-white shadow-[inset_0_1px_0_rgba(224,242,254,0.15)]">
                    <span className="led-pin-warm" />
                    <span>Executive Director: <strong className="text-sky-200 font-semibold">Wasil Azad</strong></span>
                  </span>
                </div>
              </div>

              {/* Column 2: Examination Suites & Core Skill Chambers */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-6 text-left border-t lg:border-t-0 lg:border-l border-sky-400/15 pt-6 lg:pt-0 lg:pl-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-sky-300 uppercase tracking-wider">
                    <span className="led-pin" />
                    <span>IELTS Skill Chambers</span>
                  </div>
                  <div className="flex flex-col items-start gap-2 text-xs sm:text-sm font-medium text-slate-100">
                    <button
                      onClick={() => {
                        setCurrentTab("dashboard");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {t("navDashboard", "Command Deck")}
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("fulltests");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {t("navFullTests", "Full 4-Skill Simulations")}
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("reading");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {t("navReading", "Reading Matrix")}
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("listening");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {t("navListening", "Listening Lab")}
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("writing");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {t("navWriting", "Writing Evaluator")}
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("speaking");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {t("navSpeaking", "Speaking Studio")}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-sky-300 uppercase tracking-wider">
                    <span className="led-pin-warm" />
                    <span>Global Admissions</span>
                  </div>
                  <div className="flex flex-col items-start gap-2 text-xs sm:text-sm font-medium text-slate-100">
                    <button
                      onClick={() => {
                        setCurrentTab("international-exams");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-sky-300 hover:text-white transition-colors cursor-pointer font-semibold"
                    >
                      All International Suites
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("pte");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      PTE Academic · Pearson
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("sat");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      Digital SAT · College Board
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("gre");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      GRE General · ETS
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("gmat");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      GMAT Focus · GMAC
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTab("toefl");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      TOEFL iBT &amp; ACT Suite
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 3: Credentials, Psychometrics & Director Controls */}
              <div className="lg:col-span-3 space-y-3 text-left border-t lg:border-t-0 lg:border-l border-sky-400/15 pt-6 lg:pt-0 lg:pl-8">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-sky-300 uppercase tracking-wider">
                  <span className="led-pin-emerald" />
                  <span>Credentials &amp; Ledger</span>
                </div>
                <div className="flex flex-col items-start gap-2.5 text-xs sm:text-sm font-medium text-slate-100">
                  <button
                    onClick={() => {
                      setCurrentTab("certificate");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    {t("navCertificate", "Official TRF Certificate")}
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTab("verify");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer font-semibold"
                  >
                    {t("navVerify", "Direct Verification Portal")}
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTab("iqtest");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-purple-300 hover:text-purple-200 transition-colors cursor-pointer"
                  >
                    {t("navIqTest", "Mensa SD-15 IQ Matrix")}
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTab("guide");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    {t("navGuide", "Rubric & Band Calculator")}
                  </button>
                  {user?.role === "admin" && (
                    <button
                      onClick={() => {
                        setCurrentTab("database-studio");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-emerald-300 hover:underline cursor-pointer font-semibold"
                    >
                      Director Wasil Azad · Master DB
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Architectural LED Divider & Sharp Legal / Attribution Bar */}
            <div className="mt-8 pt-5 border-t border-sky-400/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-2.5 text-white font-medium">
                <span className="led-pin" />
                <span>
                  LingoFi · International Standardized Testing &amp; Psychometric Platform
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 text-slate-200">
                <span>Director: <strong className="text-white">Wasil Azad</strong></span>
                <span className="text-sky-400/60">·</span>
                <span className="text-sky-200">Cryptographic TRF Ledger</span>
                <span className="led-pin-emerald" />
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Reset Progress Confirmation Dialog */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="chrono-panel w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-display font-bold text-white">
              Purge All Recorded Telemetry &amp; Progress?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will clear all completed test attempts, band breakdowns, and saved local progress records. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="btn-chrono-secondary rounded-xl px-4 py-2 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-display font-bold text-white transition cursor-pointer"
              >
                Confirm Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
