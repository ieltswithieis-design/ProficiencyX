import { IeltsDatabase, ReadingTest, ListeningTest, WritingTest, SpeakingTest, Question } from "../types/ielts";

function normalizeQuestion(raw: any, index: number): Question {
  const rawType = String(raw?.type || "").toLowerCase();
  const options = Array.isArray(raw?.options) ? raw.options.map(String) : undefined;
  const isMcq = rawType.includes("multiple-choice") || rawType === "mcq" || Array.isArray(raw?.options);
  let answer: string | number = raw?.answer ?? raw?.correctAnswer ?? "";
  if (isMcq && options?.length) {
    const correctText = String(raw?.correctAnswer ?? raw?.answer ?? "");
    const numeric = Number(answer);
    if (Number.isInteger(numeric) && numeric >= 0 && numeric < options.length) {
      answer = numeric;
    } else {
      const found = options.findIndex((option) => option.trim().toLowerCase() === correctText.trim().toLowerCase());
      answer = found >= 0 ? found : correctText;
    }
  }
  return {
    type: isMcq ? "mcq" : rawType.includes("tf") ? "tfng" : "short",
    q: String(raw?.q ?? raw?.prompt ?? "").trim(),
    ...(options?.length ? { options } : {}),
    answer,
  };
}

export function normalizeIeltsDatabase(raw: any): IeltsDatabase {
  const source = raw || {};
  const reading: ReadingTest[] = Array.isArray(source.reading) ? source.reading.map((test: any) => ({
    id: Number(test.id),
    title: String(test.title || `IELTS Academic Reading Test ${test.id}`),
    passages: Array.isArray(test.passages) ? test.passages.map(String) : [],
    questions: Array.isArray(test.questions) ? test.questions.map(normalizeQuestion) : [],
  })) : [];

  const listening: ListeningTest[] = Array.isArray(source.listening) ? source.listening.map((test: any) => ({
    id: Number(test.id),
    title: String(test.title || `IELTS Academic Listening Test ${test.id}`),
    parts: Array.isArray(test.parts) ? test.parts.map((part: any, partIndex: number) => ({
      part: Number(part.part ?? partIndex + 1),
      script: String(part.script || ""),
      questions: Array.isArray(part.questions) ? part.questions.map(normalizeQuestion) : [],
    })) : [],
  })) : [];

  const writing: WritingTest[] = Array.isArray(source.writing) ? source.writing.map((test: any) => ({
    id: Number(test.id),
    title: String(test.title || `IELTS Academic Writing Test ${test.id}`),
    task1: String(test.task1 ?? test.task1Prompt ?? ""),
    task1_type: String(test.task1_type ?? test.task1Type ?? "chart"),
    task2: String(test.task2 ?? test.task2Prompt ?? ""),
    visual: test.visual ?? { kind: "table", headers: [], rows: [] },
    task1Prompt: String(test.task1Prompt ?? test.task1 ?? ""),
    task2Prompt: String(test.task2Prompt ?? test.task2 ?? ""),
    task1Type: String(test.task1Type ?? test.task1_type ?? "chart"),
    task1Instructions: test.task1Instructions,
    task2Instructions: test.task2Instructions,
    responseRequirements: test.responseRequirements,
  })) : [];

  const speaking: SpeakingTest[] = Array.isArray(source.speaking) ? source.speaking.map((test: any) => ({
    id: Number(test.id),
    title: String(test.title || `IELTS Academic Speaking Test ${test.id}`),
    part1: Array.isArray(test.part1) ? test.part1.map(String) : [],
    part2: typeof test.part2 === "object" ? String(test.part2?.cueCard ?? "") : String(test.part2 ?? ""),
    part3: Array.isArray(test.part3) ? test.part3.map(String) : [],
  })) : [];

  return { reading, listening, writing, speaking };
}
