import React, { useState } from "react";
import {
  ArrowRight,
  Clock3,
  CheckCircle2,
  Mic2,
  BookOpen,
  Headphones,
  PenLine,
  ShieldCheck,
  Search,
  Layers,
  Compass,
  Award,
  Calculator,
  Cpu
} from "lucide-react";
import { motion } from "motion/react";
import { ExamMeta, StandardizedTestPackage } from "../types/standardizedTests";

interface Props {
  meta: ExamMeta;
  packages: StandardizedTestPackage[];
  onStart: (packageId: string) => void;
  onBack: () => void;
}

const DEFAULT_SECTIONS_BY_EXAM: Record<
  string,
  Array<{ id: string; title: string; duration: string; taskTypes: string[] }>
> = {
  pte: [
    {
      id: "speaking-writing",
      title: "Part 1: Speaking & Writing",
      duration: "76–84 minutes",
      taskTypes: [
        "Read Aloud",
        "Repeat Sentence",
        "Describe Image",
        "Retell Lecture",
        "Answer Short Question",
        "Summarize Group Discussion",
        "Respond to a Situation",
        "Summarize Written Text",
        "Write Essay",
      ],
    },
    {
      id: "reading",
      title: "Part 2: Reading",
      duration: "23–30 minutes",
      taskTypes: [
        "Reading & Writing: Fill in the Blanks",
        "Multiple Choice, Multiple Answers",
        "Reorder Paragraph",
        "Reading: Fill in the Blanks",
        "Multiple Choice, Single Answer",
      ],
    },
    {
      id: "listening",
      title: "Part 3: Listening",
      duration: "31–39 minutes",
      taskTypes: [
        "Summarize Spoken Text",
        "Multiple Choice, Multiple Answers",
        "Fill in the Blanks",
        "Highlight Correct Summary",
        "Multiple Choice, Single Answer",
        "Select Missing Word",
        "Highlight Incorrect Words",
        "Write from Dictation",
      ],
    },
  ],
  sat: [
    {
      id: "sat-rw-m1",
      title: "Section 1 · Module 1: Reading & Writing",
      duration: "32 minutes · 27 questions",
      taskTypes: [
        "Craft and Structure (Words in Context, Text Structure & Purpose)",
        "Information and Ideas (Central Ideas, Command of Quantitative & Textual Evidence)",
        "Cross-Text Connections & Comparative Passages",
      ],
    },
    {
      id: "sat-rw-m2",
      title: "Section 1 · Module 2: Adaptive Reading & Writing",
      duration: "32 minutes · 27 questions",
      taskTypes: [
        "Standard English Conventions (Boundaries, Form, Structure, and Sense)",
        "Expression of Ideas (Rhetorical Synthesis & Transitions)",
        "High-Difficulty Multistage Adaptive Verbal Reasoning",
      ],
    },
    {
      id: "sat-math-m1",
      title: "Section 2 · Module 1: Mathematics",
      duration: "35 minutes · 22 questions",
      taskTypes: [
        "Algebra (Linear Equations, Systems of Two Linear Equations, Linear Inequalities)",
        "Problem-Solving and Data Analysis (Ratios, Rates, Probability, Statistical Inference)",
        "Student-Produced Response & Multiple-Choice Items",
      ],
    },
    {
      id: "sat-math-m2",
      title: "Section 2 · Module 2: Adaptive Advanced Math",
      duration: "35 minutes · 22 questions",
      taskTypes: [
        "Advanced Math (Nonlinear Functions, Quadratic & Exponential Equations, Equivalent Expressions)",
        "Geometry and Trigonometry (Area & Volume, Right Triangle Trigonometry, Circles)",
        "Multistage Adaptive Quantitative Modeling",
      ],
    },
  ],
  gre: [
    {
      id: "gre-awa",
      title: "Section 1: Analytical Writing (AWA)",
      duration: "30 minutes · 1 Essay Task",
      taskTypes: [
        "Analyze an Issue Task (Constructive Critique & Argumentative Thesis)",
        "Complex Claim Evaluation & Counter-Argument Synthesis",
        "Graduate-Level Rhetorical & Syntactic Cohesion",
      ],
    },
    {
      id: "gre-verbal",
      title: "Section 2: Verbal Reasoning (Sections 1 & 2)",
      duration: "41 minutes · 27 questions",
      taskTypes: [
        "Text Completion (Single-Blank, Double-Blank, and Triple-Blank Contexts)",
        "Sentence Equivalence (6-Option Synonymous Pair Selection)",
        "Reading Comprehension & Critical Reasoning Passages",
      ],
    },
    {
      id: "gre-quant",
      title: "Section 3: Quantitative Reasoning (Sections 1 & 2)",
      duration: "47 minutes · 27 questions",
      taskTypes: [
        "Quantitative Comparison (Quantity A vs. Quantity B Deductive Analysis)",
        "Numeric Entry & Multiple-Choice (Single and Multiple Answer Selection)",
        "Data Interpretation Sets, Algebra, Geometry & Discrete Probability",
      ],
    },
  ],
  gmat: [
    {
      id: "gmat-quant",
      title: "Section 1: Quantitative Reasoning",
      duration: "45 minutes · 21 questions",
      taskTypes: [
        "Problem Solving in Algebraic & Arithmetic Modeling",
        "Rates, Work, Combinatorics, Number Properties & Financial Optimization",
        "Computer-Adaptive Item Progression",
      ],
    },
    {
      id: "gmat-verbal",
      title: "Section 2: Verbal Reasoning",
      duration: "45 minutes · 23 questions",
      taskTypes: [
        "Critical Reasoning (Assumption, Strengthen/Weaken, Paradox, Boldface Logic)",
        "Reading Comprehension (Primary Purpose, Inference, Application in Humanities & Economics)",
        "Executive Decision Logic Evaluation",
      ],
    },
    {
      id: "gmat-di",
      title: "Section 3: Data Insights",
      duration: "45 minutes · 20 questions",
      taskTypes: [
        "Data Sufficiency (Statement 1 & Statement 2 Sufficiency Logic)",
        "Multi-Source Reasoning & Table Analysis",
        "Graphics Interpretation & Two-Part Analysis",
      ],
    },
  ],
  toefl: [
    {
      id: "toefl-reading",
      title: "Section 1: Academic Reading",
      duration: "35 minutes · 20 questions",
      taskTypes: [
        "2 University-Level Passages (~700 words each)",
        "Factual Information, Inference, Rhetorical Purpose & Vocabulary in Context",
        "Insert Text & Prose Summary Synthesis",
      ],
    },
    {
      id: "toefl-listening",
      title: "Section 2: Campus & Lecture Listening",
      duration: "36 minutes · 28 questions",
      taskTypes: [
        "3 Academic Lectures (6 questions each) & 2 Campus Conversations (5 questions each)",
        "Gist-Content, Gist-Purpose, Detail, Speaker Attitude & Organization",
        "Connecting Content & Pragmatic Understanding",
      ],
    },
    {
      id: "toefl-speaking",
      title: "Section 3: Integrated & Independent Speaking",
      duration: "16 minutes · 4 tasks",
      taskTypes: [
        "Task 1: Independent Speaking (Personal Preference & Justification)",
        "Task 2: Campus Situation Integrated Reading + Listening + Speaking",
        "Tasks 3 & 4: Academic Course Concept & Lecture Synthesis",
      ],
    },
    {
      id: "toefl-writing",
      title: "Section 4: Academic Writing",
      duration: "29 minutes · 2 tasks",
      taskTypes: [
        "Task 1: Integrated Writing Task (20 mins · Read Academic Passage + Listen to Lecture)",
        "Task 2: Writing for an Academic Discussion (10 mins · Professor & Student Forum Response)",
      ],
    },
  ],
  act: [
    {
      id: "act-english",
      title: "Section 1: English Usage & Rhetoric",
      duration: "45 minutes · 75 questions",
      taskTypes: [
        "Production of Writing (Topic Development, Organization, Unity, and Cohesion)",
        "Knowledge of Language (Word Choice, Style, and Tone Consistency)",
        "Conventions of Standard English (Sentence Structure, Punctuation, and Usage)",
      ],
    },
    {
      id: "act-math",
      title: "Section 2: Mathematics",
      duration: "60 minutes · 60 questions",
      taskTypes: [
        "Number & Quantity, Algebra, and Functions",
        "Coordinate & Plane Geometry, Trigonometry, and Complex Numbers",
        "Statistics, Probability, and Modeling",
      ],
    },
    {
      id: "act-reading",
      title: "Section 3: Reading Comprehension",
      duration: "35 minutes · 40 questions",
      taskTypes: [
        "Key Ideas and Details Across Literary Narrative, Social Science, Humanities & Natural Science",
        "Craft and Structure (Point of View, Contextual Meaning, Authorial Rhetoric)",
        "Integration of Knowledge and Ideas (Paired Passages)",
      ],
    },
    {
      id: "act-science",
      title: "Section 4: Science Reasoning",
      duration: "35 minutes · 40 questions",
      taskTypes: [
        "Interpretation of Data (Tables, Graphs, Scatterplots & Experimental Diagrams)",
        "Scientific Investigation (Experimental Design, Variables, Controls & Hypotheses)",
        "Evaluation of Models, Inferences, and Experimental Results (Conflicting Viewpoints)",
      ],
    },
  ],
};

export const PteAcademicHub: React.FC<Props> = ({ meta, packages, onStart, onBack }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  const sections =
    meta.sections && meta.sections.length > 0
      ? meta.sections
      : DEFAULT_SECTIONS_BY_EXAM[meta.id] || DEFAULT_SECTIONS_BY_EXAM.pte;

  const difficulties = Array.from(new Set(packages.map((p) => p.difficulty).filter(Boolean)));

  const filteredPackages = packages.filter((pkg, idx) => {
    const matchesDifficulty = difficultyFilter === "all" || pkg.difficulty === difficultyFilter;
    if (!matchesDifficulty) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      pkg.title.toLowerCase().includes(q) ||
      pkg.edition.toLowerCase().includes(q) ||
      pkg.difficulty.toLowerCase().includes(q) ||
      String(idx + 1).includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Full-Width Year-3000 Command Hero */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="chrono-panel chrono-reticle relative overflow-hidden rounded-3xl p-6 sm:p-10"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            onClick={onBack}
            className="btn-chrono-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-mono cursor-pointer"
          >
            <span>← Back to All International Exams</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
            <span>{meta.governingBody}</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400">{packages.length} FULL MOCK TESTS AVAILABLE</span>
          </div>
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.45fr_.75fr] items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>{meta.badge}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-white">
              {meta.name} <span className="text-cyan-400">Full Simulation Suite</span>
            </h1>

            <p className="text-xs font-mono text-cyan-300/90 uppercase tracking-wider">
              {meta.fullName} · Accepted by {meta.acceptedInstitutions}
            </p>

            <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              {meta.description}
            </p>

            <div className="pt-2 flex flex-wrap gap-2.5 text-xs font-mono text-cyan-200">
              <span className="rounded-xl bg-[#050b16] px-3.5 py-2 border border-cyan-500/30">
                Scale: <strong className="text-cyan-300">{meta.scoringScale}</strong>
              </span>
              <span className="rounded-xl bg-[#050b16] px-3.5 py-2 border border-cyan-500/30">
                Duration: <strong className="text-white">{meta.durationMinutes} Minutes</strong>
              </span>
              <span className="rounded-xl bg-[#050b16] px-3.5 py-2 border border-cyan-500/30">
                Structure: <strong className="text-white">{sections.length} Official Sections</strong>
              </span>
              <span className="rounded-xl bg-[#050b16] px-3.5 py-2 border border-cyan-500/30">
                Database: <strong className="text-emerald-400">{packages.length} Complete Simulations</strong>
              </span>
            </div>

            {packages.length > 0 && (
              <div className="pt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onStart(packages[0].id)}
                  className="btn-chrono-primary inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-xs sm:text-sm cursor-pointer"
                >
                  <Layers className="h-4 w-4" />
                  <span>Start {meta.name} Simulation #1 Now</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Orbital Telemetry Box */}
          <div className="rounded-2xl border border-cyan-500/30 bg-[#050b16]/90 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  OFFICIAL EXAMINATION ARCHITECTURE
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-display font-bold text-white tabular-nums">
                  {packages.length} Mock Tests
                </div>
              </div>
              <div className="relative h-14 w-14 rounded-xl border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center">
                <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full pointer-events-none">
                  <motion.circle
                    cx="28"
                    cy="28"
                    r="23"
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="1.2"
                    strokeDasharray="6 4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                    style={{ originX: "28px", originY: "28px" }}
                  />
                </svg>
                <Compass className="h-6 w-6 text-cyan-300" />
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <span className="text-slate-400">Target Audience:</span>
                <span className="text-white text-right">{meta.targetAudience}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cyan-500/10">
                <span className="text-slate-400">Scoring Scale:</span>
                <span className="text-cyan-300 font-bold">{meta.scoringScale}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Tested Skills:</span>
                <span className="text-emerald-400 text-right">{meta.skills.join(" · ")}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 2. Full-Width Official Section Breakdown */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              01 · OFFICIAL SECTION &amp; TASK ARCHITECTURE
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
              {meta.name} Section Structure &amp; Question Types
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {sections.length} SECTIONS · {meta.durationMinutes} MIN TOTAL
          </span>
        </div>

        <div
          className={`grid gap-4 ${
            sections.length === 4
              ? "md:grid-cols-2 xl:grid-cols-4"
              : sections.length === 2
              ? "md:grid-cols-2"
              : "lg:grid-cols-3"
          }`}
        >
          {sections.map((section, i) => (
            <article
              key={section.id}
              className="chrono-panel chrono-reticle rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#050b16] border border-cyan-500/30 text-cyan-300">
                    {i === 0 ? (
                      <Mic2 className="h-5 w-5" />
                    ) : i === 1 ? (
                      <BookOpen className="h-5 w-5" />
                    ) : i === 2 ? (
                      <Headphones className="h-5 w-5" />
                    ) : (
                      <Calculator className="h-5 w-5" />
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#050b16] border border-cyan-500/25 px-2.5 py-1 text-[11px] font-mono text-cyan-300">
                    <Clock3 className="h-3.5 w-3.5 text-cyan-400" /> {section.duration}
                  </span>
                </div>

                <h3 className="mt-4 text-base sm:text-lg font-display font-bold text-white">
                  {section.title}
                </h3>

                <div className="mt-4 space-y-2">
                  {section.taskTypes.map((type, idx) => (
                    <div key={type} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>
                        <strong className="text-cyan-300 font-mono">{idx + 1}.</strong> {type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. Full-Width Expanded Practice Test Database (All 200 Mock Tests) */}
      <section className="chrono-panel chrono-reticle rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-cyan-500/20 pb-5">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" /> Complete Practice Test Database · Full-Page View
            </div>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-display font-bold text-white">
              {meta.name} Official Mock Simulations ({filteredPackages.length} of {packages.length})
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-3xl">
              Every {meta.name} mock simulation is expanded below across the full page with timed sections, official scoring curves, and complete answer rationales.
            </p>
          </div>

          {/* Search & Difficulty Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {difficulties.length > 1 && (
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[#050b16] p-1 border border-cyan-500/25">
                <button
                  type="button"
                  onClick={() => setDifficultyFilter("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-mono transition cursor-pointer ${
                    difficultyFilter === "all"
                      ? "bg-cyan-400 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({packages.length})
                </button>
                {difficulties.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficultyFilter(diff)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-mono transition cursor-pointer ${
                      difficultyFilter === diff
                        ? "bg-cyan-400 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-cyan-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${meta.name} test #1–${packages.length}...`}
                className="w-full rounded-xl border border-cyan-500/30 bg-[#050b16] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Full-Page Multi-Column Grid of All Simulations */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPackages.map((pkg, idx) => {
            const totalQuestions = pkg.sections.reduce((n, s) => n + s.questions.length, 0);
            const totalMinutes =
              pkg.sections.reduce((n, s) => n + (s.timeMinutes || 0), 0) || meta.durationMinutes;

            return (
              <button
                key={pkg.id}
                onClick={() => onStart(pkg.id)}
                className="group rounded-2xl border border-cyan-500/25 bg-[#050b16]/90 p-5 text-left hover:border-cyan-400 hover:bg-[#09152b] transition flex flex-col justify-between cursor-pointer shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-cyan-500/15 border border-cyan-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                      SIMULATION #{String(idx + 1).padStart(3, "0")}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                      {pkg.difficulty}
                    </span>
                  </div>

                  <div className="mt-3 text-sm sm:text-base font-display font-bold text-white group-hover:text-cyan-300 transition">
                    {pkg.title}
                  </div>

                  <div className="mt-2 text-[11px] font-mono text-slate-400">
                    {pkg.edition}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-slate-900 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-200">
                      {pkg.sections.length} Sections
                    </span>
                    <span className="rounded-md bg-slate-900 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      {totalQuestions} Questions
                    </span>
                    <span className="rounded-md bg-slate-900 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      {totalMinutes} Min
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-cyan-500/15 flex items-center justify-between text-xs font-display font-bold text-cyan-300">
                  <span>Start Full Simulation</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}

          {filteredPackages.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-cyan-500/30 p-8 text-center text-sm text-slate-400">
              No matching {meta.name} simulations found for &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
