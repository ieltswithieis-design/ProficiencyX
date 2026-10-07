import React, { useState } from "react";
import { ExamMeta, StandardizedDatabase, StandardizedExamId } from "../types/standardizedTests";
import { STANDARDIZED_EXAMS_META, STANDARDIZED_TEST_PACKAGES } from "../data/standardizedTestsData";
import {
  Globe2,
  Award,
  CheckCircle2,
  ArrowRight,
  Search,
  Layers,
  Brain,
  Compass
} from "lucide-react";
import { motion } from "motion/react";

interface StandardizedExamsHubProps {
  onSelectStandardizedTest: (examId: StandardizedExamId, packageId?: string) => void;
  onSelectIelts: () => void;
  onSelectIqTest: () => void;
  database?: StandardizedDatabase | null;
  initialExamId?: StandardizedExamId | null;
}

type ExamCategory = "all" | "english" | "undergraduate" | "graduate" | "cognitive";

export const StandardizedExamsHub: React.FC<StandardizedExamsHubProps> = ({
  onSelectStandardizedTest,
  onSelectIelts,
  onSelectIqTest,
  database,
  initialExamId = null,
}) => {
  const [activeCategory, setActiveCategory] = useState<ExamCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const liveExams =
    database?.exams && Object.keys(database.exams).length
      ? database.exams
      : STANDARDIZED_EXAMS_META;
  const livePackages = database?.packages || STANDARDIZED_TEST_PACKAGES;
  const examsList: ExamMeta[] = Object.values(liveExams) as ExamMeta[];

  const filteredExams = examsList.filter((exam) => {
    if (initialExamId && exam.id !== initialExamId) return false;
    const matchesSearch =
      exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.governingBody.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCategory === "all") return true;
    if (activeCategory === "english") return exam.id === "pte" || exam.id === "toefl";
    if (activeCategory === "undergraduate") return exam.id === "sat" || exam.id === "act";
    if (activeCategory === "graduate") return exam.id === "gre" || exam.id === "gmat";
    if (activeCategory === "cognitive") return false;
    return true;
  });

  return (
    <div className="space-y-10 pb-16">
      {/* Command Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="chrono-panel chrono-reticle relative overflow-hidden rounded-2xl p-6 sm:p-10"
      >
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
            <Globe2 className="h-3.5 w-3.5" />
            <span>
              {initialExamId
                ? `${initialExamId.toUpperCase()} EXAMINATION MATRIX`
                : "INTERNATIONAL STANDARDIZED EXAMINATION AUTHORITY"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white [text-wrap:balance]">
            {initialExamId
              ? `${String(initialExamId).toUpperCase()} Calibrated Simulation Suites`
              : "Global Higher Education & Psychometric Examination Matrix"}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Full computerized simulations with algorithmic scoring curves across{" "}
            <span className="text-cyan-300 font-medium">
              PTE Academic, Digital SAT, GRE General, GMAT Focus, TOEFL iBT, ACT
            </span>
            , alongside our{" "}
            <span className="text-cyan-300 font-medium">IELTS Academic Battery</span> and{" "}
            <span className="text-cyan-300 font-medium">Mensa SD-15 IQ Matrix</span>.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono text-emerald-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Official Scoring Curves</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Cryptographic Score Reports</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Full Item Rationales</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter & Search Bar */}
      <div className="chrono-panel flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: "all" as ExamCategory, label: "All Suites" },
            { id: "english" as ExamCategory, label: "English (PTE · TOEFL · IELTS)" },
            { id: "undergraduate" as ExamCategory, label: "Undergraduate (SAT · ACT)" },
            { id: "graduate" as ExamCategory, label: "Graduate (GRE · GMAT)" },
            { id: "cognitive" as ExamCategory, label: "Mensa IQ" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono transition whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-cyan-400 text-slate-950 font-bold"
                  : "bg-[#050b16] text-slate-400 hover:text-white border border-cyan-500/20"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-cyan-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter exam, governing body..."
            className="w-full rounded-xl border border-cyan-500/30 bg-[#050b16] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Flagship Quick-Launch Chambers for IELTS and Mensa IQ */}
      {!initialExamId && (activeCategory === "all" || activeCategory === "english") && (
        <div className="chrono-panel chrono-reticle rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-xs font-mono text-cyan-400">
                FLAGSHIP FOUR-SKILL ARCHITECTURE · CAMBRIDGE / IDP / BC
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold text-white">
                IELTS Academic Comprehensive Testing Hub
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Complete library of modular skill tests and full 4-skill mock simulations with autonomous AI writing &amp; speaking evaluation and verifiable TRF certificates.
              </p>
            </div>
            <button
              onClick={onSelectIelts}
              className="btn-chrono-primary w-full md:w-auto shrink-0 rounded-xl px-6 py-3.5 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Initialize IELTS Hub</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-cyan-500/20">
            {[
              ["Listening", "4 Channels · 40 Items", "Multi-accent dialogues & academic lectures."],
              ["Reading", "3 Passages · 40 Items", "Research texts with full item analysis."],
              ["Writing", "Task 1 + Task 2", "Visual telemetry report and discursive essay."],
              ["Speaking", "Parts 1, 2 & 3", "Biometric voice capture and fluency grading."],
            ].map(([title, parts, detail]) => (
              <button
                key={title}
                onClick={onSelectIelts}
                className="text-left rounded-xl border border-cyan-500/25 bg-[#050b16] p-4 hover:border-cyan-400 transition cursor-pointer"
              >
                <div className="text-sm font-display font-bold text-white">{title}</div>
                <div className="mt-0.5 text-[11px] font-mono text-cyan-400">{parts}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-slate-400">{detail}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!initialExamId && (activeCategory === "all" || activeCategory === "cognitive") && (
        <div className="chrono-panel chrono-reticle rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-xs font-mono text-purple-400">
                PSYCHOMETRIC CALIBRATION · WECHSLER SD-15 NORM
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold text-white">
                Standardized Cognitive Intelligence Exam (Mensa Scale)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                35 fluid intelligence, Raven-style spatial matrix, and deductive quantitative items calibrated to standard deviation 15 with cryptographic IQ credential issuance.
              </p>
            </div>
            <button
              onClick={onSelectIqTest}
              className="btn-chrono-primary w-full md:w-auto shrink-0 rounded-xl px-6 py-3.5 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Initialize IQ Matrix</span>
              <Brain className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full-Width Expanded Sections for Each International Standardized Exam */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-cyan-400" />
            <span>International Examination Suites · Full-Width Sections</span>
          </h2>
          <span className="text-xs font-mono text-cyan-300">
            {filteredExams.length} ACTIVE EXAMINATION AUTHORITIES
          </span>
        </div>

        <div className="space-y-8">
          {filteredExams.map((exam, idx) => {
            const examPackages = livePackages.filter(
              (p) => p?.examId === exam.id && p.published !== false
            );
            const previewPackages = examPackages.slice(0, 12);

            return (
              <motion.section
                key={exam.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="chrono-panel chrono-reticle rounded-3xl p-6 sm:p-8 space-y-6"
              >
                {/* Top Full-Width Header for this Exam Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-cyan-500/20 pb-6">
                  <div className="space-y-2.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="text-cyan-400 font-bold">{exam.governingBody}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-emerald-400 tabular-nums">
                        {examPackages.length} FULL MOCK SIMULATIONS
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-amber-300">{exam.badge}</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
                      {exam.name} <span className="text-cyan-400 text-lg sm:text-xl font-normal">({exam.fullName})</span>
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {exam.description}
                    </p>

                    <div className="pt-1 flex flex-wrap gap-2 text-xs font-mono">
                      <span className="rounded-lg bg-[#050b16] border border-cyan-500/25 px-3 py-1.5 text-cyan-300">
                        Scale: <strong>{exam.scoringScale}</strong>
                      </span>
                      <span className="rounded-lg bg-[#050b16] border border-cyan-500/25 px-3 py-1.5 text-white">
                        Duration: <strong>{exam.durationMinutes} MIN</strong>
                      </span>
                      <span className="rounded-lg bg-[#050b16] border border-cyan-500/25 px-3 py-1.5 text-slate-300">
                        Skills: <strong>{exam.skills.join(" · ")}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                    <button
                      onClick={() => onSelectStandardizedTest(exam.id)}
                      className="btn-chrono-primary rounded-xl px-6 py-3.5 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Layers className="h-4 w-4" />
                      <span>Open Full {exam.name} Page ({examPackages.length} Tests)</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    {examPackages[0] && (
                      <button
                        onClick={() => onSelectStandardizedTest(exam.id, examPackages[0].id)}
                        className="btn-chrono-secondary rounded-xl px-5 py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <span>Quick-Start Simulation #1</span>
                        <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Broad Full-Width Multi-Column Grid of Simulations for this Exam */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-400 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{exam.name.toUpperCase()} SIMULATION DIRECTORY ({examPackages.length} TOTAL)</span>
                    </span>
                    <button
                      onClick={() => onSelectStandardizedTest(exam.id)}
                      className="text-cyan-300 hover:text-white underline cursor-pointer"
                    >
                      View All {examPackages.length} {exam.name} Tests on Full Page →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {previewPackages.map((pkg, pIdx) => (
                      <button
                        key={pkg.id}
                        onClick={() => onSelectStandardizedTest(exam.id, pkg.id)}
                        className="group flex flex-col justify-between gap-3 p-4 rounded-2xl bg-[#050b16] border border-cyan-500/20 hover:border-cyan-400 hover:bg-[#09152b] transition text-left cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                            <span className="text-cyan-300 font-bold">
                              SIMULATION #{String(pIdx + 1).padStart(3, "0")}
                            </span>
                            <span className="text-amber-300">{pkg.difficulty}</span>
                          </div>
                          <p className="mt-2 font-display font-bold text-white text-sm group-hover:text-cyan-300 transition">
                            {pkg.title}
                          </p>
                          <span className="mt-1 block text-[11px] font-mono text-slate-400">
                            {pkg.edition} · {pkg.sections.reduce((n, s) => n + s.questions.length, 0)} Items
                          </span>
                        </div>
                        <div className="pt-2 border-t border-cyan-500/15 flex items-center justify-between text-xs font-display font-bold text-cyan-300">
                          <span>Start Simulation</span>
                          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {examPackages.length > 12 && (
                    <div className="pt-2 flex justify-center">
                      <button
                        onClick={() => onSelectStandardizedTest(exam.id)}
                        className="btn-chrono-secondary rounded-xl px-6 py-3 text-xs font-mono text-cyan-300 hover:text-white flex items-center gap-2 cursor-pointer"
                      >
                        <Layers className="h-4 w-4 text-cyan-400" />
                        <span>
                          Browse All {examPackages.length} {exam.name} Mock Tests in Dedicated Full-Page View →
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.section>
            );
          })}
        </div>
      </div>

      {/* Benchmark Equivalency Matrix */}
      <div className="chrono-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-lg sm:text-xl font-display font-bold text-white">
            International Examination Benchmark &amp; Equivalency Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Standardized assessment protocols recognized across global research universities and credentialing bodies.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-cyan-500/30 bg-[#050b16] text-cyan-300">
                <th className="p-3">Examination</th>
                <th className="p-3">Authority</th>
                <th className="p-3">Scale</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Primary Focus</th>
                <th className="p-3 text-right">Execute</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/15 text-slate-300">
              <tr className="hover:bg-cyan-500/5">
                <td className="p-3 font-bold text-white">PTE Academic</td>
                <td className="p-3">Pearson VUE</td>
                <td className="p-3 text-cyan-300 tabular-nums">10 – 90 PTS</td>
                <td className="p-3 tabular-nums">120 MIN</td>
                <td className="p-3 font-sans">Academic &amp; Visa English Proficiency</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onSelectStandardizedTest("pte")}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Launch →
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-cyan-500/5">
                <td className="p-3 font-bold text-white">Digital SAT</td>
                <td className="p-3">College Board</td>
                <td className="p-3 text-cyan-300 tabular-nums">400 – 1600</td>
                <td className="p-3 tabular-nums">134 MIN</td>
                <td className="p-3 font-sans">Undergraduate Admissions</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onSelectStandardizedTest("sat")}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Launch →
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-cyan-500/5">
                <td className="p-3 font-bold text-white">GRE General</td>
                <td className="p-3">ETS</td>
                <td className="p-3 text-cyan-300 tabular-nums">260 – 340</td>
                <td className="p-3 tabular-nums">118 MIN</td>
                <td className="p-3 font-sans">Graduate &amp; Doctoral Admissions</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onSelectStandardizedTest("gre")}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Launch →
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-cyan-500/5">
                <td className="p-3 font-bold text-white">GMAT Focus</td>
                <td className="p-3">GMAC</td>
                <td className="p-3 text-cyan-300 tabular-nums">205 – 805</td>
                <td className="p-3 tabular-nums">135 MIN</td>
                <td className="p-3 font-sans">MBA &amp; Executive Management</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onSelectStandardizedTest("gmat")}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Launch →
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-cyan-500/5">
                <td className="p-3 font-bold text-white">TOEFL iBT</td>
                <td className="p-3">ETS</td>
                <td className="p-3 text-cyan-300 tabular-nums">0 – 120 PTS</td>
                <td className="p-3 tabular-nums">116 MIN</td>
                <td className="p-3 font-sans">University English Comprehension</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onSelectStandardizedTest("toefl")}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Launch →
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-cyan-500/5">
                <td className="p-3 font-bold text-white">ACT Composite</td>
                <td className="p-3">ACT Inc.</td>
                <td className="p-3 text-cyan-300 tabular-nums">1 – 36 SCALE</td>
                <td className="p-3 tabular-nums">175 MIN</td>
                <td className="p-3 font-sans">STEM &amp; Collegiate Readiness</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onSelectStandardizedTest("act")}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Launch →
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-cyan-500/5">
                <td className="p-3 font-bold text-white">IELTS Academic</td>
                <td className="p-3">Cambridge / IDP / BC</td>
                <td className="p-3 text-cyan-300 tabular-nums">BAND 1.0 – 9.0</td>
                <td className="p-3 tabular-nums">165 MIN</td>
                <td className="p-3 font-sans">Global University &amp; Migration Standard</td>
                <td className="p-3 text-right">
                  <button
                    onClick={onSelectIelts}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Open Hub →
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-cyan-500/5">
                <td className="p-3 font-bold text-white">Mensa Cognitive IQ</td>
                <td className="p-3">LingoFi Psychometrics</td>
                <td className="p-3 text-cyan-300 tabular-nums">IQ 70 – 160</td>
                <td className="p-3 tabular-nums">40 MIN</td>
                <td className="p-3 font-sans">Fluid Intelligence &amp; Matrix Logic</td>
                <td className="p-3 text-right">
                  <button
                    onClick={onSelectIqTest}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Initialize →
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
