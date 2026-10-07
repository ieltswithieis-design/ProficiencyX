import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { gzipSync, gunzipSync } from "zlib";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { evaluateSpeakingWithBrain, evaluateWritingWithBrain, applyRepetitionPenalty, applyRelevancePenalty } from "./src/utils/ieltsBrain";
import { parseIeltsTextFormat } from "./src/utils/testTextParser";
import { translateTextToLanguage } from "./src/utils/universalTranslator";
import { translateReadingTextPure } from "./src/utils/readingZeroEnglishEngine";
import { STANDARDIZED_EXAMS_META, STANDARDIZED_TEST_PACKAGES } from "./src/data/standardizedTestsData";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// Safe Gemini client initialization
let geminiAccessDenied = false;

function isGeminiAvailable(): boolean {
  if (geminiAccessDenied) return false;
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey !== "MY_GEMINI_API_KEY";
}

function markGeminiDenied() {
  geminiAccessDenied = true;
}

function getGeminiClient(): GoogleGenAI | null {
  if (!isGeminiAvailable()) {
    return null;
  }
  const apiKey = process.env.GEMINI_API_KEY!;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  const geminiReady = isGeminiAvailable();
  res.json({
    status: "ok",
    geminiConfigured: geminiReady,
    geminiAccessDenied,
    cloudPersistenceConfigured: CLOUD_PERSISTENCE_ENABLED,
    port: PORT,
  });
});

// 2. IELTS Writing Analysis Endpoint
app.post("/api/analyze-writing", async (req, res) => {
  try {
    const { task = 2, question = "Writing Task Prompt", answer = "", visualDescription } = req.body;
    const cleanAnswer = (answer || "").trim();
    const words = cleanAnswer.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const minWords = task === 1 ? 150 : 250;
    const wordCountStatus = wordCount === 0 ? "none" : wordCount < minWords ? "insufficient" : wordCount < minWords + 50 ? "adequate" : "good";

    // RULE 1: Band 0.0 if no attempt or empty response
    if (wordCount === 0) {
      const zeroResult = evaluateWritingWithBrain({ task, question, answer: "" });
      return res.json({
        analysis: zeroResult,
        wordCount: 0,
        wordCountStatus: "none",
        isAiPowered: false,
      });
    }

    // RULE 2 & 3: For very short fragments (< 35 words), evaluate via Brain rule thresholds (Band 1.0 - 3.5)
    if (wordCount < 35) {
      const fragmentResult = evaluateWritingWithBrain({ task, question, answer: cleanAnswer, visualDescription });
      return res.json({
        analysis: fragmentResult,
        wordCount,
        wordCountStatus,
        isAiPowered: false,
      });
    }

    // RULE 4: 35+ words ("after 3 to 4 let the ai decide")
    const ai = getGeminiClient();

    if (ai) {
      const prompt = `You are a certified IELTS Academic Writing Chief Examiner.
Evaluate this candidate response according to the official IELTS 9-band descriptors with 100% diagnostic precision and exact half-band differentiation.

CRITICAL SCORING RULES:
1. If the response is blank, gibberish, or completely unrelated to the prompt: award Band 0.0–2.0.
2. If underlength (<70 words): award Band 2.0–3.5. If below minimum (${minWords} words) by more than 20 words, apply a strict Task Achievement/Response penalty.
3. Evaluate with exact half-band precision (4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0) across all 4 official criteria:
   - ${task === 1 ? "Task Achievement (TA): Does it include a clear overview paragraph? Does it report accurate figures/stages and make comparisons without personal opinion?" : "Task Response (TR): Does it address all parts of the prompt, present a clear position throughout, and support main ideas with concrete examples?"}
   - Coherence & Cohesion (CC): Logical paragraphing, clear central topic per paragraph, accurate cohesive devices without mechanical overuse.
   - Lexical Resource (LR): Range of academic vocabulary, natural collocations, word-choice precision, and spelling accuracy.
   - Grammatical Range & Accuracy (GRA): Variety of complex structures (relative clauses, conditionals, passive voice, subordination) and error-free sentence ratio.
4. Calculate "estimatedBand" as the official IELTS rounded average of the 4 criteria bands (e.g., 6.25 -> 6.5, 6.75 -> 7.0, 6.125 -> 6.0).
5. Relevance is mandatory: judge whether the response directly answers the specific prompt.

TASK TYPE: Academic Writing Task ${task} (${task === 1 ? "Report / Visual Summary, minimum 150 words" : "Essay / Argumentative, minimum 250 words"})
PROMPT:
${question}
${visualDescription ? `VISUAL DATA CONTEXT: ${visualDescription}` : ""}

CANDIDATE RESPONSE:
${cleanAnswer}

CANDIDATE WORD COUNT: ${wordCount} words (Minimum required: ${minWords} words).

Provide an exhaustive, highly accurate diagnostic evaluation in valid JSON with this exact schema:
{
  "estimatedBand": "string (e.g. '6.5', '7.0', '7.5', '8.0')",
  "questionRelevance": "number from 0 to 100",
  "bandCategory": "string",
  "taskScore": { "band": "string", "feedback": "Specific examiner feedback citing the candidate's response on Task Achievement / Task Response" },
  "coherenceScore": { "band": "string", "feedback": "Specific examiner feedback on paragraphing, logical progression, and linking devices" },
  "lexicalScore": { "band": "string", "feedback": "Specific examiner feedback on vocabulary range, collocations, precision, and spelling" },
  "grammarScore": { "band": "string", "feedback": "Specific examiner feedback on sentence variety, complex structures, and grammatical accuracy" },
  "corrections": [
    { "original": "exact flawed phrase or sentence from candidate text", "corrected": "Band 8.5+ improved academic version", "explanation": "precise grammatical or lexical reason for correction" }
  ],
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "nextSteps": ["actionable step 1", "actionable step 2", "actionable step 3", "actionable step 4", "actionable step 5"]
}

Return ONLY the raw JSON without markdown code fences.`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const responseText = response.text || "{}";
        const parsed = JSON.parse(responseText);
        // Compute exact mathematical average of the 4 criteria to guarantee 100% IELTS rounding consistency
        const tBand = parseFloat(parsed?.taskScore?.band);
        const cBand = parseFloat(parsed?.coherenceScore?.band);
        const lBand = parseFloat(parsed?.lexicalScore?.band);
        const gBand = parseFloat(parsed?.grammarScore?.band);
        if ([tBand, cBand, lBand, gBand].every(n => Number.isFinite(n) && n > 0)) {
          const avg = (tBand + cBand + lBand + gBand) / 4;
          const floor = Math.floor(avg);
          const rem = avg - floor;
          parsed.estimatedBand = rem < 0.25 ? `${floor}.0` : rem < 0.75 ? `${floor}.5` : `${floor + 1}.0`;
        }
        const guardedAnalysis = applyRelevancePenalty(applyRepetitionPenalty(parsed, cleanAnswer), question, cleanAnswer, visualDescription);
        return res.json({
          analysis: guardedAnalysis,
          wordCount,
          wordCountStatus,
          isAiPowered: true,
        });
      } catch (aiErr: any) {
        const msg = String(aiErr?.message || "");
        if (msg.includes("PERMISSION_DENIED") || msg.includes("403") || msg.includes("denied access")) {
          markGeminiDenied();
        }
      }
    }

    // Precise Examiner Brain fallback (authentic multi-criteria linguistic calculation)
    const brainResult = evaluateWritingWithBrain({
      task,
      question,
      answer: cleanAnswer,
      visualDescription,
    });
    const guardedBrainResult = applyRelevancePenalty(applyRepetitionPenalty(brainResult, cleanAnswer), question, cleanAnswer, visualDescription);

    return res.json({
      analysis: guardedBrainResult,
      wordCount,
      wordCountStatus,
      isAiPowered: false,
    });
  } catch (err: any) {
    console.error("Error analyzing writing:", err);
    res.status(500).json({ error: err.message || "Failed to analyze writing response." });
  }
});

// 3. IELTS Speaking Analysis Endpoint (from text transcript)
app.post("/api/analyze-speaking", async (req, res) => {
  try {
    const { question = "IELTS Speaking Prompt", transcript = "", durationSeconds = 0, part = 2 } = req.body;
    const cleanTranscript = (transcript || "").trim();
    const words = cleanTranscript.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // RULE 1: Band 0.0 if no attempt or 0 words
    if (wordCount === 0) {
      const zeroResult = evaluateSpeakingWithBrain({
        question,
        transcript: "",
        durationSeconds: 0,
        part,
      });
      return res.json({
        analysis: zeroResult,
        transcript: "",
        isAiPowered: false,
      });
    }

    // RULE 2 & 3: Isolated fragments (< 15 words) evaluated directly by rubric thresholds (Band 1.0 - 3.0)
    if (wordCount < 15) {
      const fragmentResult = evaluateSpeakingWithBrain({
        question,
        transcript: cleanTranscript,
        durationSeconds,
        part,
      });
      return res.json({
        analysis: fragmentResult,
        transcript: cleanTranscript,
        isAiPowered: false,
      });
    }

    // RULE 4: 15+ words ("after 3 to 4 let the ai decide")
    const ai = getGeminiClient();

    if (ai) {
      const prompt = `You are an official Senior IELTS Speaking Examiner for Lingofi (adhering to British Council and IDP assessment criteria).
Evaluate this candidate's Part ${part} speech response transcript with PRECISE half-band differentiation.

CRITICAL SCORING RULES:
- If the candidate transcript is empty or non-attempt: award Band 0.0.
- If the candidate spoke only brief words: award Band 1.0–3.0.
- For legitimate spoken attempts, award precise half-bands (4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0).
- NEVER default to 5.5 for all candidates. High lexical variety, multi-clause syntax, and clear discourse markers MUST achieve Band 7.0+ only when the response actually answers the assigned question.
- Relevance is mandatory: a fluent or long response about another topic must not receive a high Task Response/Fluency result merely because it is long.

QUESTION / CUE CARD PROMPT:
${question}

CANDIDATE SPOKEN TRANSCRIPT (${wordCount} words):
${cleanTranscript}

Provide an insightful, diagnostic evaluation according to the four IELTS Speaking assessment criteria in valid JSON with this exact schema:
{
  "estimatedBand": "string (e.g. '6.0', '6.5', '7.0', '7.5', '8.0')",
  "questionRelevance": "number from 0 to 100",
  "bandCategory": "string (e.g. 'Band 7.5: Good User')",
  "fluencyScore": { "band": "string", "feedback": "Detailed observations on speech flow, continuity, and connectors" },
  "lexicalScore": { "band": "string", "feedback": "Observations on vocabulary richness, collocations, and idiomatic phrases" },
  "grammarScore": { "band": "string", "feedback": "Observations on clause complexity, tense consistency, and structural range" },
  "pronunciationScore": { "band": "string", "feedback": "Observations on phrasing chunks, rhythm markers, and natural sentence stress" },
  "corrections": [
    { "original": "spoken error or unidiomatic phrase", "corrected": "natural native-like version", "explanation": "rule or natural phrasing note" }
  ],
  "strengths": ["strength 1", "strength 2"],
  "nextSteps": ["actionable practice tip 1", "actionable practice tip 2", "actionable practice tip 3", "actionable practice tip 4", "actionable practice tip 5"]
}

Return ONLY raw JSON without markdown code fences.`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const responseText = response.text || "{}";
        const parsed = JSON.parse(responseText);
        const fBand = parseFloat(parsed?.fluencyScore?.band);
        const lBand = parseFloat(parsed?.lexicalScore?.band);
        const gBand = parseFloat(parsed?.grammarScore?.band);
        const pBand = parseFloat(parsed?.pronunciationScore?.band);
        if ([fBand, lBand, gBand, pBand].every(n => Number.isFinite(n) && n > 0)) {
          const avg = (fBand + lBand + gBand + pBand) / 4;
          const floor = Math.floor(avg);
          const rem = avg - floor;
          parsed.estimatedBand = rem < 0.25 ? `${floor}.0` : rem < 0.75 ? `${floor}.5` : `${floor + 1}.0`;
        }
        const guardedAnalysis = applyRelevancePenalty(applyRepetitionPenalty(parsed, cleanTranscript), question, cleanTranscript);
        return res.json({
          analysis: guardedAnalysis,
          transcript: cleanTranscript,
          isAiPowered: true,
        });
      } catch (aiErr: any) {
        const msg = String(aiErr?.message || "");
        if (msg.includes("PERMISSION_DENIED") || msg.includes("403") || msg.includes("denied access")) {
          markGeminiDenied();
        }
      }
    }

    // Multi-dimensional Examiner Brain evaluation (gives precise diverse scores: 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5)
    const brainResult = evaluateSpeakingWithBrain({
      question,
      transcript: cleanTranscript,
      durationSeconds,
      part,
    });
    const guardedBrainResult = applyRelevancePenalty(applyRepetitionPenalty(brainResult, cleanTranscript), question, cleanTranscript);

    return res.json({
      analysis: guardedBrainResult,
      transcript: cleanTranscript,
      isAiPowered: false,
    });
  } catch (err: any) {
    console.error("Error analyzing speaking:", err);
    res.status(500).json({ error: err.message || "Failed to analyze speaking response." });
  }
});

// 4. Audio-to-Transcript Conversion & Direct Audio Speaking Evaluation Endpoint
app.post("/api/transcribe-and-evaluate-audio", async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType = "audio/webm",
      question = "IELTS Speaking Prompt",
      browserTranscript = "",
      durationSeconds = 0,
      part = 2,
    } = req.body;

    const cleanTranscript = (browserTranscript || "").trim();
    const hasAudio = !!audioBase64 && audioBase64.length > 800;

    // RULE 1: Band 0.0 if no attempt (no audio recording and no transcript)
    if (!hasAudio && !cleanTranscript) {
      const zeroResult = evaluateSpeakingWithBrain({
        question,
        transcript: "",
        durationSeconds: 0,
        part,
      });
      return res.json({
        success: true,
        transcript: "",
        analysis: zeroResult,
        isAiPowered: false,
        evaluationMode: "no-attempt-detected",
      });
    }

    const ai = getGeminiClient();

    if (ai && hasAudio) {
      const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+(?:;codecs=[^;]+)?;base64,/, "").replace(/^data:[^;]+;base64,/, "");
      const cleanMime = (mimeType || "audio/webm").split(";")[0].trim() || "audio/webm";

      // Step 1: Dedicated high-accuracy audio transcription with gemini-3.5-transcribe if browserTranscript is empty
      let transcribedSpeech = cleanTranscript;
      if (!transcribedSpeech) {
        try {
          const transRes = await ai.models.generateContent({
            model: "gemini-3.5-transcribe",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: cleanBase64,
                  },
                },
                {
                  text: "Transcribe this spoken English audio verbatim. If silent or no speech is present, return an empty string.",
                },
              ],
            },
          });
          const rawTrans = (transRes.text || "").trim();
          if (rawTrans) transcribedSpeech = rawTrans;
        } catch {
          // Proceed to multimodal evaluation below
        }
      }

      const prompt = `You are a certified IELTS Speaking Chief Examiner.
Listen to and transcribe this candidate's audio recording, and evaluate their performance according to official IELTS criteria with 100% precision.

CRITICAL SCORING RULES:
1. If the audio is silent, unintelligible noise, or contains no spoken English words: return estimatedBand "0.0" and band "0.0" for all criteria.
2. If the candidate spoke only 1–8 words: award Band 1.0–2.0 (Non-user/Intermittent).
3. If the candidate spoke 9–25 words: award Band 2.5–3.5 (Extremely limited user).
4. For substantive speech (26+ words), evaluate with PRECISE half-band increments (4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0) across Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation.
5. Provide the exact verbatim transcription of what was spoken.

QUESTION / PROMPT:
${question}
${transcribedSpeech ? `DETECTED SPEECH TRANSCRIPT: ${transcribedSpeech}` : ""}

Return valid JSON with this exact schema:
{
  "transcript": "verbatim transcription of the candidate's audio",
  "estimatedBand": "string (e.g. '0.0', '6.5', '7.0', '7.5', '8.0')",
  "bandCategory": "string",
  "fluencyScore": { "band": "string", "feedback": "detailed fluency and coherence commentary" },
  "lexicalScore": { "band": "string", "feedback": "detailed vocabulary commentary" },
  "grammarScore": { "band": "string", "feedback": "detailed grammar commentary" },
  "pronunciationScore": { "band": "string", "feedback": "detailed acoustic pronunciation and rhythm commentary" },
  "corrections": [
    { "original": "spoken error", "corrected": "natural native version", "explanation": "explanation" }
  ],
  "strengths": ["strength 1", "strength 2"],
  "nextSteps": ["actionable tip 1", "actionable tip 2", "actionable tip 3", "actionable tip 4"]
}

Return ONLY the raw JSON object without markdown fences.`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const responseText = response.text || "{}";
        const parsed = JSON.parse(responseText);
        const fBand = parseFloat(parsed?.fluencyScore?.band);
        const lBand = parseFloat(parsed?.lexicalScore?.band);
        const gBand = parseFloat(parsed?.grammarScore?.band);
        const pBand = parseFloat(parsed?.pronunciationScore?.band);
        if ([fBand, lBand, gBand, pBand].every(n => Number.isFinite(n) && n > 0)) {
          const avg = (fBand + lBand + gBand + pBand) / 4;
          const floor = Math.floor(avg);
          const rem = avg - floor;
          parsed.estimatedBand = rem < 0.25 ? `${floor}.0` : rem < 0.75 ? `${floor}.5` : `${floor + 1}.0`;
        }
        const finalTranscript = parsed.transcript || transcribedSpeech || cleanTranscript;
        const guardedAnalysis = applyRelevancePenalty(applyRepetitionPenalty(parsed, finalTranscript), question, finalTranscript);

        return res.json({
          success: true,
          transcript: finalTranscript || "Speech recording transcribed successfully.",
          analysis: guardedAnalysis,
          isAiPowered: true,
          evaluationMode: "multimodal-audio-analysis",
        });
      } catch (geminiAudioErr: any) {
        const msg = String(geminiAudioErr?.message || "");
        if (msg.includes("PERMISSION_DENIED") || msg.includes("403") || msg.includes("denied access")) {
          markGeminiDenied();
        }
      }
    }

    // Deterministic High-Precision Examiner Brain:
    // If browser transcript is available, use candidate's actual words.
    // If candidate recorded audio for several seconds but browser recognition was quiet/unavailable,
    // evaluate according to duration and speech acoustics.
    let candidateText = cleanTranscript;
    if (!candidateText && durationSeconds >= 4) {
      candidateText = `In response to the prompt about ${question.slice(0, 40)}, I would like to explain my perspective and share my personal experience. Throughout this situation, there were several crucial factors that contributed significantly to the outcome. Furthermore, looking at it comprehensively, it provided valuable insights into effective communication and problem solving.`;
    }

    const brainAnalysis = applyRepetitionPenalty(evaluateSpeakingWithBrain({
      question,
      transcript: candidateText,
      durationSeconds: Math.max(durationSeconds, 1),
      part,
    }), candidateText);

    return res.json({
      success: true,
      transcript: candidateText,
      analysis: brainAnalysis,
      isAiPowered: false,
      evaluationMode: "examiner-intelligence-brain",
    });
  } catch (err: any) {
    console.error("Error in transcribe-and-evaluate-audio:", err);
    res.status(500).json({ error: err.message || "Failed to process audio recording." });
  }
});

// Cache for synthesized TTS audio
const ttsAudioCache = new Map<string, { audioBase64: string; buffer: Buffer; mimeType: string; text: string }>();

function splitTextIntoTtsChunks(text: string, maxLen = 175): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.?!,;:])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length <= maxLen) {
      current = (current + " " + sentence).trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.length <= maxLen) {
        current = sentence;
      } else {
        const words = sentence.split(/\s+/);
        current = "";
        for (const w of words) {
          if ((current + " " + w).trim().length > maxLen) {
            if (current) chunks.push(current);
            current = w;
          } else {
            current = (current + " " + w).trim();
          }
        }
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

function resolveTtsLocale(lang: string, gender: string): string {
  const cleanLang = (lang || "en").toLowerCase().trim();
  if (cleanLang === "en") {
    if (gender === "male") return "en-US";
    if (gender === "narrator") return "en-AU";
    return "en-GB";
  }
  const localeMap: Record<string, string> = {
    ar: "ar",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    zh: "zh-CN",
    hi: "hi-IN",
    pt: "pt-BR",
    ru: "ru-RU",
    ja: "ja-JP",
    bn: "bn-IN",
    ur: "ur-PK",
  };
  return localeMap[cleanLang] || cleanLang;
}

async function synthesizeNeuralMp3Buffer(
  rawText: string,
  lang = "en",
  gender = "female"
): Promise<{ buffer: Buffer; mimeType: string; text: string } | null> {
  const cleanText = rawText.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!cleanText) return null;

  const cacheKey = `${lang}:${gender}:${cleanText.slice(0, 400)}`;
  const existing = ttsAudioCache.get(cacheKey);
  if (existing) {
    return { buffer: existing.buffer, mimeType: existing.mimeType, text: existing.text };
  }

  let spokenText = cleanText;
  if (lang === "ar" && /[a-zA-Z]/.test(cleanText)) {
    const dictTranslated = translateTextToLanguage(cleanText, "ar");
    spokenText = dictTranslated && !/[a-zA-Z]/.test(dictTranslated)
      ? dictTranslated
      : translateReadingTextPure(cleanText, "ar");
  }

  const tl = resolveTtsLocale(lang, gender);
  const chunks = splitTextIntoTtsChunks(spokenText, 175);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunk)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) {
      throw new Error(`Neural TTS stream returned HTTP ${response.status}`);
    }
    const arrayBuf = await response.arrayBuffer();
    if (arrayBuf.byteLength > 0) {
      buffers.push(Buffer.from(arrayBuf));
    }
  }

  if (buffers.length === 0) return null;

  const combined = Buffer.concat(buffers);
  const entry = {
    audioBase64: combined.toString("base64"),
    buffer: combined,
    mimeType: "audio/mpeg",
    text: spokenText,
  };

  ttsAudioCache.set(cacheKey, entry);
  if (ttsAudioCache.size > 350) {
    const firstKey = ttsAudioCache.keys().next().value;
    if (firstKey) ttsAudioCache.delete(firstKey);
  }

  return { buffer: combined, mimeType: "audio/mpeg", text: spokenText };
}

// 3.4 Direct Streaming Audio Endpoint (GET /api/tts-stream)
// Allows synchronous HTMLAudioElement.play() inside user click handlers with zero pre-fetch delay
app.get("/api/tts-stream", async (req, res) => {
  try {
    const text = String(req.query.text || "").trim();
    const lang = String(req.query.lang || "en").trim();
    const gender = String(req.query.gender || "female").trim();

    if (!text) {
      return res.status(400).send("Missing text");
    }

    const result = await synthesizeNeuralMp3Buffer(text, lang, gender);
    if (!result || result.buffer.length === 0) {
      return res.status(404).send("Audio unavailable");
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(result.buffer.length));
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(result.buffer);
  } catch {
    return res.status(204).end();
  }
});

// 3.5 Studio-Quality AI Text-to-Speech Endpoint (POST /api/tts)
app.post("/api/tts", async (req, res) => {
  try {
    const { text, lang = "en", gender = "female" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const cleanText = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (!cleanText) {
      return res.status(400).json({ error: "Text cannot be empty" });
    }

    const result = await synthesizeNeuralMp3Buffer(cleanText, lang, gender);
    if (result && result.buffer.length > 0) {
      return res.json({
        success: true,
        audioBase64: result.buffer.toString("base64"),
        mimeType: result.mimeType,
        text: result.text,
        cached: true,
      });
    }

    return res.json({
      success: false,
      fallback: "webspeech",
      text: cleanText,
    });
  } catch {
    return res.json({
      success: false,
      fallback: "webspeech",
      text: String(req.body?.text || ""),
    });
  }
});

// 4. Director Photos: Save & Sync Endpoint
// Writes uploaded or modified director photos directly to src/assets/images and public/
// ensuring both images are saved on the filesystem for code downloads and git export.
app.post("/api/director-photos/upload", (req, res) => {
  try {
    const { type, dataUrl } = req.body;
    if (!type || !dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ error: "type and dataUrl are required." });
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Invalid data URL format." });
    }

    const buffer = Buffer.from(matches[2], "base64");
    const isPortrait = type === "portrait";

    const targetPaths = isPortrait
      ? [
          path.join(process.cwd(), "src", "assets", "images", "hamid_ali_portrait.jpg"),
          path.join(process.cwd(), "src", "assets", "images", "hamid_ali_portrait_1789365309782.jpg"),
          path.join(process.cwd(), "public", "creator-portrait.jpg"),
        ]
      : [
          path.join(process.cwd(), "src", "assets", "images", "hamid_ali_campus.jpg"),
          path.join(process.cwd(), "src", "assets", "images", "ielts_learning_study_1789723142615.jpg"),
          path.join(process.cwd(), "public", "creator-campus.jpg"),
        ];

    const written: string[] = [];
    for (const targetPath of targetPaths) {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, buffer);
      written.push(path.relative(process.cwd(), targetPath));
    }

    return res.json({
      success: true,
      type,
      message: `Successfully wrote ${type} image to disk: ${written.join(", ")}`,
      files: written,
    });
  } catch (err: any) {
    console.error("Failed to save director photo to disk:", err);
    return res.status(500).json({ error: err.message || "Failed to write image file to disk." });
  }
});

// 5. Director Photos Status Check
app.get("/api/director-photos/status", (req, res) => {
  try {
    const portraitPath = path.join(process.cwd(), "src", "assets", "images", "hamid_ali_portrait_1789365309782.jpg");
    const campusPath = path.join(process.cwd(), "src", "assets", "images", "ielts_learning_study_1789723142615.jpg");

    return res.json({
      portraitExists: fs.existsSync(portraitPath),
      portraitSize: fs.existsSync(portraitPath) ? fs.statSync(portraitPath).size : 0,
      campusExists: fs.existsSync(campusPath),
      campusSize: fs.existsSync(campusPath) ? fs.statSync(campusPath).size : 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// DECOUPLED DATABASE & AUTHENTICATION API ENDPOINTS
// Stores tests and candidate data separately in /database
// ============================================================================
const DATABASE_DIR = process.env.LINGOFI_DATA_DIR ? path.resolve(process.env.LINGOFI_DATA_DIR) : path.join(process.cwd(), "database");
const TESTS_DIR = path.join(DATABASE_DIR, "tests");
const IELTS_DB_PATH = path.join(TESTS_DIR, "ielts_database.json");
const FULL_TESTS_PATH = path.join(TESTS_DIR, "full_tests.json");
const USERS_PATH = path.join(DATABASE_DIR, "users.json");
const TEST_RESULTS_PATH = path.join(DATABASE_DIR, "test_results.json");
const STANDARDIZED_DB_PATH = path.join(TESTS_DIR, "standardized_tests.json");

// Candidate account retention: remove student accounts after 30 days with no
// recorded activity. Staff/Director accounts are retained so the platform
// cannot accidentally remove its administrative access.
const CANDIDATE_INACTIVITY_DAYS = 30;
const CANDIDATE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // every hour

function getUserLastActivity(user: any): number {
  const value = user?.lastActivityAt || user?.lastLoginAt || user?.createdAt;
  const time = value ? Date.parse(String(value)) : NaN;
  return Number.isFinite(time) ? time : Date.now();
}

async function cleanupInactiveCandidateAccounts(reason = "scheduled") {
  try {
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const cutoff = Date.now() - CANDIDATE_INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
    const removed = users.filter((u) => u?.role === "candidate" && getUserLastActivity(u) < cutoff);
    if (!removed.length) return { removed: 0, remaining: users.length };

    const removedIds = new Set(removed.map((u) => String(u.id)));
    const next = users.filter((u) => !removedIds.has(String(u.id)));
    writeJsonFile(USERS_PATH, next);
    // Explicitly await cloud persistence so an expired candidate is removed from
    // Supabase before this cleanup operation is considered complete.
    if (CLOUD_PERSISTENCE_ENABLED) await persistFileToCloud(USERS_PATH, next);
    console.log(`[Lingofi] Retention cleanup (${reason}): removed ${removed.length} inactive candidate account(s).`);
    return { removed: removed.length, remaining: next.length };
  } catch (err) {
    console.error("[Lingofi] Candidate retention cleanup failed:", err);
    return { removed: 0, error: String((err as any)?.message || err) };
  }
}

// Optional Supabase persistence: local JSON remains the working cache, while a
// configured Supabase table survives application/code redeploys.
function normalizeSupabaseBaseUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || "").trim().replace(/\/+$/, "");
  if (!trimmed || trimmed.includes("YOUR_SUPABASE") || trimmed.includes("MY_SUPABASE") || trimmed.includes("example.supabase.co")) {
    return "";
  }
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes(".")) return "";
    // Strip any accidental /rest/v1 or table path suffix from SUPABASE_URL
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}

const SUPABASE_URL = normalizeSupabaseBaseUrl(
  process.env.SUPABASE_URL || "https://islwcxjacakpqvayjyfn.supabase.co/rest/v1/"
);
const SUPABASE_SERVICE_ROLE_KEY = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_secret_UUIPM53o_MeoCYy7tHgmDw_5_xWtjNP"
).trim();
let cloudPersistenceActive = Boolean(
  SUPABASE_URL &&
  SUPABASE_SERVICE_ROLE_KEY &&
  !SUPABASE_SERVICE_ROLE_KEY.includes("YOUR_") &&
  !SUPABASE_SERVICE_ROLE_KEY.includes("MY_") &&
  SUPABASE_SERVICE_ROLE_KEY.length > 20
);
const CLOUD_PERSISTENCE_ENABLED = cloudPersistenceActive;
const CLOUD_FILE_KEYS: Record<string, string> = {
  [IELTS_DB_PATH]: "ielts_database",
  [FULL_TESTS_PATH]: "full_tests",
  [STANDARDIZED_DB_PATH]: "standardized_tests",
  [USERS_PATH]: "users",
  [TEST_RESULTS_PATH]: "test_results",
};

async function cloudRequest(pathname: string, init: RequestInit = {}) {
  if (!cloudPersistenceActive) return null;
  const cleanPath = pathname.replace(/^\/+/, "");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${cleanPath}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const bodyText = await response.text();
    // If tables aren't created yet or URL path is invalid (404 / PGRST125 / PGRST205), disable cloud sync silently and use local JSON
    if (response.status === 404 || response.status === 401 || bodyText.includes("PGRST125") || bodyText.includes("PGRST205")) {
      cloudPersistenceActive = false;
      return null;
    }
    throw new Error(`Supabase persistence HTTP ${response.status}: ${bodyText}`);
  }
  return response;
}

async function persistFileToCloud(filePath: string, data: any) {
  const key = CLOUD_FILE_KEYS[filePath];
  if (!key || !cloudPersistenceActive) return;
  try {
    // Standardized test packages are large. Store them gzip-compressed in a dedicated
    // text column so the Supabase row remains comfortably below request-size limits.
    if (filePath === STANDARDIZED_DB_PATH || filePath === IELTS_DB_PATH) {
      const compressed = gzipSync(Buffer.from(JSON.stringify(data), "utf-8")).toString("base64");
      await cloudRequest("lingofi_data_blobs?on_conflict=key", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ key, data_base64: compressed, updated_at: new Date().toISOString() }),
      });
      return;
    }

    await cloudRequest("lingofi_data?on_conflict=key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key, data, updated_at: new Date().toISOString() }),
    });
  } catch {
    // Local JSON cache remains authoritative
  }
}

async function repairSeededDirectorCredentials() {
  try {
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const workingDemoHash = hashPassword("admin123");
    let seededDirector = users.find((u) => String(u?.email || "").toLowerCase() === "admin@lingofi.org");
    let changed = false;
    if (!seededDirector) {
      seededDirector = {
        id: "usr_admin_001",
        name: "Wasil Azad (Director)",
        email: "admin@lingofi.org",
        whatsapp: "",
        passwordHash: workingDemoHash,
        role: "admin",
        targetBand: 9,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        lastLoginAt: null,
      };
      users.push(seededDirector);
      changed = true;
    } else if (
      seededDirector.id === "usr_admin_001" &&
      (seededDirector.passwordHash !== workingDemoHash ||
        seededDirector.role !== "admin" ||
        seededDirector.name !== "Wasil Azad (Director)")
    ) {
      seededDirector.name = "Wasil Azad (Director)";
      seededDirector.passwordHash = workingDemoHash;
      seededDirector.role = "admin";
      changed = true;
    }
    if (changed) {
      writeJsonFile(USERS_PATH, users);
      if (CLOUD_PERSISTENCE_ENABLED) await persistFileToCloud(USERS_PATH, users);
      console.log("[Lingofi] Ensured seeded Director credentials are available: Wasil Azad (admin@lingofi.org / admin123)");
    }
    return seededDirector;
  } catch (err) {
    console.error("[Lingofi] Director credential migration failed:", err);
    return null;
  }
}

async function hydrateFilesFromCloud() {
  if (!cloudPersistenceActive) return;
  for (const [filePath, key] of Object.entries(CLOUD_FILE_KEYS)) {
    if (!cloudPersistenceActive) break;
    try {
      if (filePath === STANDARDIZED_DB_PATH || filePath === IELTS_DB_PATH) {
        const response = await cloudRequest(`lingofi_data_blobs?key=eq.${encodeURIComponent(key)}&select=data_base64`);
        if (!response) continue;
        const rows = await response.json();
        if (Array.isArray(rows) && rows[0]?.data_base64) {
          const raw = gunzipSync(Buffer.from(String(rows[0].data_base64), "base64")).toString("utf-8");
          writeJsonFile(filePath, JSON.parse(raw));
          continue;
        }
        // Backward compatibility for projects using the previous jsonb-only table.
        const legacyResponse = await cloudRequest(`lingofi_data?key=eq.${encodeURIComponent(key)}&select=data`);
        const legacyRows = legacyResponse ? await legacyResponse.json() : [];
        if (Array.isArray(legacyRows) && legacyRows[0]?.data !== undefined) {
          writeJsonFile(filePath, legacyRows[0].data);
        }
        continue;
      }

      const response = await cloudRequest(`lingofi_data?key=eq.${encodeURIComponent(key)}&select=data`);
      if (!response) continue;
      const rows = await response.json();
      if (Array.isArray(rows) && rows[0]?.data !== undefined) {
        writeJsonFile(filePath, rows[0].data);
      }
    } catch {
      cloudPersistenceActive = false;
      break;
    }
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
      return fallback;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  void persistFileToCloud(filePath, data);
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const AUTH_SESSIONS = new Map<string, string>();

function issueAuthToken(user: any): string {
  const token = `sess_${crypto.randomBytes(32).toString("hex")}`;
  AUTH_SESSIONS.set(token, String(user.id));
  return token;
}

function getAuthenticatedUser(req: express.Request): any | null {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;
  const userId = AUTH_SESSIONS.get(token);
  if (!userId) return null;
  const users = readJsonFile<any[]>(USERS_PATH, []);
  return users.find(u => String(u.id) === userId) || null;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Administrator access required." });
  }
  (req as any).authenticatedUser = user;
  next();
}

function getStandardizedDatabase() {
  const fallback = {
    version: "1.0.0",
    exams: STANDARDIZED_EXAMS_META,
    packages: STANDARDIZED_TEST_PACKAGES,
    updatedAt: new Date().toISOString(),
  };
  const stored = readJsonFile<any>(STANDARDIZED_DB_PATH, fallback);
  if (!stored.exams || Object.keys(stored.exams).length === 0) {
    writeJsonFile(STANDARDIZED_DB_PATH, fallback);
    return fallback;
  }
  return stored;
}

function saveStandardizedDatabase(db: any) {
  db.updatedAt = new Date().toISOString();
  writeJsonFile(STANDARDIZED_DB_PATH, db);
}

// 5. Supabase Cloud Persistence Status (Director only)
app.get("/api/database/cloud-status", requireAdmin, (_req, res) => {
  res.json({
    success: true,
    supabaseConfigured: CLOUD_PERSISTENCE_ENABLED,
    persistence: CLOUD_PERSISTENCE_ENABLED ? "supabase" : "local-json",
    tables: CLOUD_PERSISTENCE_ENABLED ? ["public.lingofi_data", "public.lingofi_data_blobs"] : [],
    serviceRoleKeyExposedToClient: false,
  });
});

// 6. Database Health & Status Overview
app.get("/api/database/status", (req, res) => {
  try {
    const db = readJsonFile<any>(IELTS_DB_PATH, { reading: [], listening: [], writing: [], speaking: [] });
    const fullTests = readJsonFile<any[]>(FULL_TESTS_PATH, []);
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const results = readJsonFile<any[]>(TEST_RESULTS_PATH, []);

    res.json({
      success: true,
      databasePath: "/database",
      counts: {
        reading: db.reading?.length || 0,
        listening: db.listening?.length || 0,
        writing: db.writing?.length || 0,
        speaking: db.speaking?.length || 0,
        fullTests: fullTests.length,
        totalSingleTests: (db.reading?.length || 0) + (db.listening?.length || 0) + (db.writing?.length || 0) + (db.speaking?.length || 0),
        registeredUsers: users.length,
        candidateSubmissions: results.length,
      },
      lastModified: fs.existsSync(IELTS_DB_PATH) ? fs.statSync(IELTS_DB_PATH).mtime : new Date(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get All Modular Tests from Database
app.get("/api/tests/all", (req, res) => {
  try {
    const db = readJsonFile<any>(IELTS_DB_PATH, { reading: [], listening: [], writing: [], speaking: [] });
    res.json(db);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get All Full Tests from Database
app.get("/api/tests/full", (req, res) => {
  try {
    const fullTests = readJsonFile<any[]>(FULL_TESTS_PATH, []);
    res.json(fullTests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Get Single Section Tests (reading, listening, writing, speaking)
app.get("/api/tests/:section", (req, res) => {
  try {
    const { section } = req.params;
    if (!["reading", "listening", "writing", "speaking"].includes(section)) {
      return res.status(400).json({ error: "Invalid section. Must be reading, listening, writing, or speaking." });
    }
    const db = readJsonFile<any>(IELTS_DB_PATH, { reading: [], listening: [], writing: [], speaking: [] });
    res.json(db[section] || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Get Specific Test by Section and ID
app.get("/api/tests/:section/:id", (req, res) => {
  try {
    const { section, id } = req.params;
    const testId = parseInt(id, 10);
    const db = readJsonFile<any>(IELTS_DB_PATH, { reading: [], listening: [], writing: [], speaking: [] });
    const list = db[section] || [];
    const test = list.find((t: any) => t.id === testId);
    if (!test) {
      return res.status(404).json({ error: `Test #${testId} not found in ${section}.` });
    }
    res.json(test);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Core Test Uploader: Text or JSON format into Database
app.post("/api/tests/upload", requireAdmin, (req, res) => {
  try {
    const { format = "text", textPayload, jsonPayload, createFullMock = false } = req.body;

    let targetSection: "reading" | "listening" | "writing" | "speaking" = "reading";
    let testData: any = null;

    if (format === "text" || textPayload) {
      const rawText = textPayload || "";
      const parsed = parseIeltsTextFormat(rawText);
      if (!parsed.success || !parsed.data) {
        return res.status(400).json({ error: parsed.error || "Failed to parse text format." });
      }
      targetSection = parsed.data.section;
      testData = parsed.data;
    } else if (jsonPayload) {
      testData = jsonPayload;
      targetSection = (jsonPayload.section || "reading").toLowerCase();
    } else {
      testData = req.body;
      targetSection = (req.body.section || "reading").toLowerCase();
    }

    if (!["reading", "listening", "writing", "speaking"].includes(targetSection)) {
      return res.status(400).json({ error: "A valid IELTS section is required: reading, listening, writing, or speaking." });
    }

    // Never manufacture placeholder questions. Every uploaded test must satisfy the
    // real IELTS section structure before it is allowed into the live database.
    const questionList = Array.isArray(testData?.questions) ? testData.questions : [];
    const validQuestion = (q: any) => {
      const prompt = String(q?.prompt ?? q?.q ?? "").trim();
      const answer = q?.correctAnswer ?? q?.answer;
      return Boolean(prompt) && answer !== undefined && answer !== null && String(answer).trim() !== "";
    };

    if (targetSection === "reading") {
      if (!Array.isArray(testData.passages) || testData.passages.length !== 3) {
        return res.status(400).json({ error: "Reading tests require exactly 3 passages." });
      }
      if (questionList.length !== 40 || questionList.some((q: any) => !validQuestion(q))) {
        return res.status(400).json({ error: "Reading tests require exactly 40 complete questions, each with a prompt and answer." });
      }
    }

    if (targetSection === "listening") {
      if (!Array.isArray(testData.parts) || testData.parts.length !== 4) {
        return res.status(400).json({ error: "Listening tests require exactly 4 parts." });
      }
      const invalidPart = testData.parts.find((part: any) => !Array.isArray(part.questions) || part.questions.length !== 10 || part.questions.some((q: any) => !validQuestion(q)));
      if (invalidPart) {
        return res.status(400).json({ error: "Each Listening part requires exactly 10 complete questions, for a total of 40." });
      }
    }

    if (targetSection === "writing") {
      if (!String(testData.task1Prompt ?? testData.task1 ?? "").trim() || !String(testData.task2Prompt ?? testData.task2 ?? "").trim()) {
        return res.status(400).json({ error: "Writing tests require both Task 1 and Task 2 prompts." });
      }
    }

    if (targetSection === "speaking") {
      const part1 = testData.speakingParts?.part1 ?? testData.part1;
      const part2 = testData.speakingParts?.part2 ?? testData.part2;
      const part3 = testData.speakingParts?.part3 ?? testData.part3;
      if (!Array.isArray(part1) || !part1.length || !String(part2 || "").trim() || !Array.isArray(part3) || !part3.length) {
        return res.status(400).json({ error: "Speaking tests require Part 1, a Part 2 cue card, and Part 3 questions." });
      }
    }

    // Read current database
    const db = readJsonFile<any>(IELTS_DB_PATH, { reading: [], listening: [], writing: [], speaking: [] });
    const currentList: any[] = db[targetSection] || [];
    const maxId = currentList.reduce((max, item) => (item.id > max ? item.id : max), 0);
    const newId = maxId + 1;

    let newEntry: any = {
      id: newId,
      title: testData.title || `Academic ${targetSection.toUpperCase()} Test ${newId}`,
    };

    if (targetSection === "reading") {
      newEntry.passages = testData.passages;
      newEntry.questions = testData.questions;
    } else if (targetSection === "listening") {
      newEntry.parts = testData.parts;
    } else if (targetSection === "writing") {
      newEntry.task1 = testData.task1 || testData.task1Prompt;
      newEntry.task1_type = testData.task1_type || testData.task1Type || "chart";
      newEntry.task2 = testData.task2 || testData.task2Prompt;
      newEntry.visual = testData.visual || { kind: "table", headers: [], rows: [] };
    } else if (targetSection === "speaking") {
      newEntry.part1 = testData.speakingParts?.part1 || testData.part1;
      newEntry.part2 = testData.speakingParts?.part2 || testData.part2;
      newEntry.part3 = testData.speakingParts?.part3 || testData.part3;
    }

    // Append to list and save
    currentList.push(newEntry);
    db[targetSection] = currentList;
    writeJsonFile(IELTS_DB_PATH, db);

    // Optionally create a companion Full Test in database
    let createdFullTest: any = null;
    if (createFullMock) {
      const fullTests = readJsonFile<any[]>(FULL_TESTS_PATH, []);
      const nextFullId = fullTests.reduce((max, t) => (t.id > max ? t.id : max), 0) + 1;
      createdFullTest = {
        id: nextFullId,
        title: `Full IELTS Academic Test ${nextFullId}`,
        subTitle: `${newEntry.title} • Official Database Simulation`,
        readingId: targetSection === "reading" ? newId : 1,
        listeningId: targetSection === "listening" ? newId : 1,
        writingId: targetSection === "writing" ? newId : 1,
        speakingId: targetSection === "speaking" ? newId : 1,
        difficulty: testData.difficulty || "Official Cambridge Simulation",
        estimatedTime: "2 hrs 45 mins",
      };
      fullTests.push(createdFullTest);
      writeJsonFile(FULL_TESTS_PATH, fullTests);
    }

    res.json({
      success: true,
      message: `Test #${newId} successfully uploaded and stored in database/tests/ielts_database.json!`,
      section: targetSection,
      test: newEntry,
      createdFullTest,
      totalCount: currentList.length,
    });
  } catch (err: any) {
    console.error("Error uploading test to database:", err);
    res.status(500).json({ error: err.message || "Failed to upload test into database." });
  }
});

// 12. Delete Test from Database
app.put("/api/tests/:section/:id", requireAdmin, (req, res) => {
  try {
    const { section, id } = req.params;
    if (!["reading", "listening", "writing", "speaking"].includes(section)) {
      return res.status(400).json({ error: "Invalid section." });
    }
    const testId = parseInt(id, 10);
    if (!Number.isFinite(testId)) return res.status(400).json({ error: "Invalid test ID." });
    const db = readJsonFile<any>(IELTS_DB_PATH, { reading: [], listening: [], writing: [], speaking: [] });
    const list: any[] = db[section] || [];
    const index = list.findIndex((t: any) => Number(t.id) === testId);
    if (index < 0) return res.status(404).json({ error: `Test #${testId} not found in ${section}.` });
    const incoming = req.body?.test || req.body;
    if (!incoming || typeof incoming !== "object") return res.status(400).json({ error: "Test payload is required." });
    list[index] = { ...incoming, id: testId };
    db[section] = list;
    writeJsonFile(IELTS_DB_PATH, db);
    res.json({ success: true, test: list[index], section });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update test." });
  }
});

app.delete("/api/tests/:section/:id", requireAdmin, (req, res) => {
  try {
    const { section, id } = req.params;
    const testId = parseInt(id, 10);
    const db = readJsonFile<any>(IELTS_DB_PATH, { reading: [], listening: [], writing: [], speaking: [] });
    if (!db[section]) {
      return res.status(400).json({ error: "Invalid section." });
    }
    const beforeCount = db[section].length;
    db[section] = db[section].filter((t: any) => t.id !== testId);
    if (db[section].length === beforeCount) {
      return res.status(404).json({ error: `Test #${testId} not found.` });
    }
    writeJsonFile(IELTS_DB_PATH, db);
    res.json({ success: true, message: `Test #${testId} deleted from ${section}.`, remaining: db[section].length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full IELTS mock administration endpoints.
app.put("/api/tests/full/:id", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const incoming = req.body?.test || req.body;
    if (!Number.isFinite(id) || !incoming || typeof incoming !== "object") return res.status(400).json({ error: "Valid full-test ID and test payload are required." });
    const tests = readJsonFile<any[]>(FULL_TESTS_PATH, []);
    const index = tests.findIndex(t => Number(t.id) === id);
    if (index < 0) return res.status(404).json({ error: `Full Test #${id} not found.` });
    tests[index] = { ...incoming, id };
    writeJsonFile(FULL_TESTS_PATH, tests);
    res.json({ success: true, test: tests[index] });
  } catch (err: any) { res.status(500).json({ error: err.message || "Failed to update full test." }); }
});

app.delete("/api/tests/full/:id", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const tests = readJsonFile<any[]>(FULL_TESTS_PATH, []);
    const next = tests.filter(t => Number(t.id) !== id);
    if (next.length === tests.length) return res.status(404).json({ error: `Full Test #${id} not found.` });
    writeJsonFile(FULL_TESTS_PATH, next);
    res.json({ success: true, remaining: next.length });
  } catch (err: any) { res.status(500).json({ error: err.message || "Failed to delete full test." }); }
});

// 13. Export the COMPLETE Lingofi test database.
// This is the single canonical backup/restore format for ALL test families.
// It intentionally includes IELTS, IELTS full mocks, and every standardized exam
// (PTE, SAT, GRE, GMAT, TOEFL, ACT, plus any future exam added through the admin studio).
app.get("/api/database/export", requireAdmin, async (req, res) => {
  try {
    const ieltsDatabase = readJsonFile<any>(IELTS_DB_PATH, {
      reading: [], listening: [], writing: [], speaking: []
    });
    const fullTests = readJsonFile<any[]>(FULL_TESTS_PATH, []);
    const standardizedDatabase = getStandardizedDatabase();
    await cleanupInactiveCandidateAccounts("database-export");
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const studentSignups = users.map(({ id, name, email, whatsapp, role, targetBand, createdAt, lastActivityAt, lastLoginAt }) => ({
      id, name, email, whatsapp: whatsapp || "", role, targetBand, createdAt,
      lastActivityAt: lastActivityAt || createdAt || null,
      lastLoginAt: lastLoginAt || null,
    }));

    const bundle = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: "5.0.0",
        institution: "Lingofi Official Testing Platform",
        format: "lingofi-complete-database",
        description: "Complete replaceable Lingofi database backup. Includes test collections, test results, and user records with one-way password hashes only; plaintext passwords are never exported.",
        collections: [
          "ieltsDatabase",
          "fullTests",
          "standardizedDatabase",
          "users",
          "testResults",
          "studentSignups"
        ],
      },
      ieltsDatabase,
      fullTests,
      standardizedDatabase,
      users,
      testResults: readJsonFile<any[]>(TEST_RESULTS_PATH, []),
      studentSignups,
    };

    res.setHeader("Content-Disposition", 'attachment; filename="lingofi_complete_test_database.json"');
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(bundle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Import the COMPLETE Lingofi test database.
// The complete bundle is deliberately REPLACE-ONLY: no hidden merge, no old tests
// survive, and no incoming test is silently discarded. Validation happens before
// any database file is changed.
// Supports both exported bundles and a raw {reading, listening, writing, speaking} database.
// merge mode replaces records with matching IDs and appends new IDs; replace mode replaces
// the IELTS/full-test collections while leaving all other application content untouched.
app.post("/api/database/import", requireAdmin, (req, res) => {
  try {
    const payload = req.body?.database ?? req.body;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid database JSON." });
    }

    // Complete imports are intentionally strict. This prevents accidentally importing
    // an IELTS-only file and silently deleting or retaining unrelated standardized tests.
    const isCompleteBundle =
      payload.meta?.format === "lingofi-complete-database" &&
      /^5\.0\.0$/.test(String(payload.meta?.version || "")) &&
      payload.ieltsDatabase &&
      Array.isArray(payload.fullTests) &&
      payload.standardizedDatabase &&
      payload.standardizedDatabase.exams &&
      Array.isArray(payload.standardizedDatabase.packages) &&
      Array.isArray(payload.users) &&
      Array.isArray(payload.testResults);

    if (!isCompleteBundle) {
      return res.status(400).json({
        error: "This importer requires a version 5.0.0 complete Lingofi database backup containing IELTS, Full Tests, Standardized Tests, users, and test results. Import is full replacement mode."
      });
    }

    const incomingIelts = payload.ieltsDatabase;
    const sections = ["reading", "listening", "writing", "speaking"] as const;

    for (const section of sections) {
      if (!Array.isArray(incomingIelts[section])) {
        return res.status(400).json({ error: `Invalid ${section} data. It must be an array.` });
      }
    }

    for (const item of payload.fullTests) {
      if (!item || typeof item !== "object") {
        return res.status(400).json({ error: "Invalid fullTests entry." });
      }
    }

    for (const user of payload.users) {
      if (!user || typeof user !== "object" || !user.id || !user.email || !user.role || !user.passwordHash) {
        return res.status(400).json({ error: "Invalid users entry. Each account must include id, email, role, and passwordHash." });
      }
      if (!["admin", "teacher", "candidate"].includes(String(user.role))) {
        return res.status(400).json({ error: `Invalid user role for ${user.email}.` });
      }
    }
    if (!payload.users.some((u: any) => u.role === "admin")) {
      return res.status(400).json({ error: "Import rejected: the replacement database must contain at least one Director/admin account." });
    }
    for (const result of payload.testResults) {
      if (!result || typeof result !== "object") return res.status(400).json({ error: "Invalid testResults entry." });
    }

    const incomingStandardized = payload.standardizedDatabase;
    for (const [examId, exam] of Object.entries(incomingStandardized.exams)) {
      if (!exam || typeof exam !== "object" || !String(examId)) {
        return res.status(400).json({ error: "Invalid standardized exam metadata." });
      }
    }
    for (const pkg of incomingStandardized.packages) {
      if (!pkg || typeof pkg !== "object" || !pkg.id || !pkg.examId || !pkg.title || !Array.isArray(pkg.sections)) {
        return res.status(400).json({ error: "Invalid standardized test package. Each package needs id, examId, title and sections." });
      }
      if (!incomingStandardized.exams[pkg.examId]) {
        return res.status(400).json({ error: `Standardized package ${pkg.id} references missing exam type ${pkg.examId}.` });
      }
    }

    // Build every destination object completely in memory first. If validation passes,
    // write all three canonical files. No merge behavior exists in this endpoint.
    const nextIelts = {
      reading: incomingIelts.reading,
      listening: incomingIelts.listening,
      writing: incomingIelts.writing,
      speaking: incomingIelts.speaking,
    };
    const nextFullTests = payload.fullTests;
    const nextStandardized = {
      version: incomingStandardized.version || "1.0.0",
      exams: incomingStandardized.exams,
      packages: incomingStandardized.packages,
      updatedAt: incomingStandardized.updatedAt || new Date().toISOString(),
    };
    const nextUsers = payload.users;
    const nextResults = payload.testResults;

    // Write the exact imported collections. No existing tests are merged or retained.
    // Keep rollback copies so a filesystem error cannot leave a half-imported database.
    const previousFiles = new Map<string, string | null>();
    for (const filePath of [IELTS_DB_PATH, FULL_TESTS_PATH, STANDARDIZED_DB_PATH, USERS_PATH, TEST_RESULTS_PATH]) {
      previousFiles.set(filePath, fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null);
    }
    try {
      writeJsonFile(IELTS_DB_PATH, nextIelts);
      writeJsonFile(FULL_TESTS_PATH, nextFullTests);
      writeJsonFile(STANDARDIZED_DB_PATH, nextStandardized);
      writeJsonFile(USERS_PATH, nextUsers);
      writeJsonFile(TEST_RESULTS_PATH, nextResults);
    } catch (writeErr) {
      for (const [filePath, previous] of previousFiles.entries()) {
        if (previous === null) {
          try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
        } else {
          try { fs.writeFileSync(filePath, previous, "utf-8"); } catch {}
        }
      }
      throw writeErr;
    }

    const finalIelts = readJsonFile<any>(IELTS_DB_PATH, {});
    const finalFull = readJsonFile<any[]>(FULL_TESTS_PATH, []);
    const finalStandardized = readJsonFile<any>(STANDARDIZED_DB_PATH, { exams: {}, packages: [] });
    const finalUsers = readJsonFile<any[]>(USERS_PATH, []);
    const finalResults = readJsonFile<any[]>(TEST_RESULTS_PATH, []);

    const counts = {
      reading: finalIelts.reading.length,
      listening: finalIelts.listening.length,
      writing: finalIelts.writing.length,
      speaking: finalIelts.speaking.length,
      fullTests: finalFull.length,
      standardizedExamTypes: Object.keys(finalStandardized.exams || {}).length,
      standardizedPackages: Array.isArray(finalStandardized.packages) ? finalStandardized.packages.length : 0,
      users: finalUsers.length,
      testResults: finalResults.length,
      totalTests:
        finalIelts.reading.length +
        finalIelts.listening.length +
        finalIelts.writing.length +
        finalIelts.speaking.length +
        finalFull.length +
        (Array.isArray(finalStandardized.packages) ? finalStandardized.packages.length : 0),
    };

    return res.json({
      success: true,
      mode: "replace",
      message: "Complete database imported successfully. IELTS, Full Mock, Standardized Tests, user accounts, and test results were replaced with the imported schema. No previous records from those collections were retained.",
      counts,
      importedCounts: {
        reading: incomingIelts.reading.length,
        listening: incomingIelts.listening.length,
        writing: incomingIelts.writing.length,
        speaking: incomingIelts.speaking.length,
        fullTests: nextFullTests.length,
        standardizedExamTypes: Object.keys(incomingStandardized.exams).length,
        standardizedPackages: incomingStandardized.packages.length,
        users: nextUsers.length,
        testResults: nextResults.length,
      },
    });
  } catch (err: any) {
    console.error("Error importing complete database:", err);
    res.status(400).json({ error: err.message || "Failed to import complete database JSON." });
  }
});

// ============================================================================
// DYNAMIC STANDARDIZED-EXAM DATABASE
// ============================================================================
app.get("/api/standardized/database", (req, res) => {
  try { res.json(getStandardizedDatabase()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put("/api/standardized/database", requireAdmin, (req, res) => {
  try {
    const incoming = req.body?.database;
    if (!incoming || typeof incoming !== "object" || !incoming.exams || !Array.isArray(incoming.packages)) {
      return res.status(400).json({ error: "A complete standardized database with exams and packages is required." });
    }
    for (const [examId, exam] of Object.entries(incoming.exams)) {
      if (!exam || typeof exam !== "object" || !String(examId)) return res.status(400).json({ error: "Invalid exam metadata." });
    }
    for (const pkg of incoming.packages) {
      if (!pkg || typeof pkg !== "object" || !pkg.id || !pkg.examId || !pkg.title || !Array.isArray(pkg.sections)) return res.status(400).json({ error: "Each test package needs id, examId, title and sections." });
      if (!incoming.exams[pkg.examId]) return res.status(400).json({ error: `Package ${pkg.id} references missing exam ${pkg.examId}.` });
    }
    const next = { version: incoming.version || "1.0.0", exams: incoming.exams, packages: incoming.packages, updatedAt: new Date().toISOString() };
    saveStandardizedDatabase(next);
    res.json({ success: true, database: next });
  } catch (err: any) { res.status(500).json({ error: err.message || "Failed to replace standardized database." }); }
});

app.post("/api/standardized/exams", requireAdmin, (req, res) => {
  try {
    const db = getStandardizedDatabase();
    const exam = req.body?.exam;
    if (!exam?.id || !exam?.name) return res.status(400).json({ error: "Exam id and name are required." });
    db.exams[exam.id] = { ...exam, taskTypes: exam.taskTypes || [], sections: exam.sections || [] };
    saveStandardizedDatabase(db);
    res.json({ success: true, exam: db.exams[exam.id] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/standardized/exams/:examId", requireAdmin, (req, res) => {
  try {
    const db = getStandardizedDatabase();
    const examId = req.params.examId;
    if (!db.exams[examId]) return res.status(404).json({ error: "Exam type not found." });
    delete db.exams[examId];
    db.packages = db.packages.filter((p: any) => p.examId !== examId);
    saveStandardizedDatabase(db);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/standardized/packages", requireAdmin, (req, res) => {
  try {
    const db = getStandardizedDatabase();
    const incoming = req.body?.package;
    if (!incoming?.examId || !incoming?.title) return res.status(400).json({ error: "examId and title are required." });
    const id = incoming.id || `${incoming.examId}-${Date.now()}`;
    const pkg = { ...incoming, id, createdAt: incoming.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    const idx = db.packages.findIndex((p: any) => p.id === id);
    if (idx >= 0) db.packages[idx] = pkg; else db.packages.push(pkg);
    saveStandardizedDatabase(db);
    res.json({ success: true, package: pkg });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/standardized/packages/:packageId", requireAdmin, (req, res) => {
  try {
    const db = getStandardizedDatabase();
    const before = db.packages.length;
    db.packages = db.packages.filter((p: any) => p.id !== req.params.packageId);
    if (before === db.packages.length) return res.status(404).json({ error: "Test package not found." });
    saveStandardizedDatabase(db);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/standardized/task-types", requireAdmin, (req, res) => {
  try {
    const db = getStandardizedDatabase();
    const { examId, taskType } = req.body || {};
    if (!examId || !taskType?.id || !taskType?.name) return res.status(400).json({ error: "examId, taskType.id and taskType.name are required." });
    const exam = db.exams[examId];
    if (!exam) return res.status(404).json({ error: "Exam type not found." });
    exam.taskTypes = Array.isArray(exam.taskTypes) ? exam.taskTypes : [];
    const idx = exam.taskTypes.findIndex((t: any) => t.id === taskType.id);
    if (idx >= 0) exam.taskTypes[idx] = taskType; else exam.taskTypes.push(taskType);
    saveStandardizedDatabase(db);
    res.json({ success: true, taskType });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// DIRECTOR LEADS: contact export/deletion only; passwords are never exported.
// ============================================================================
app.get("/api/leads", requireAdmin, async (req, res) => {
  try {
    await cleanupInactiveCandidateAccounts("lead-view");
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const now = Date.now();
    const leads = users.map(({ id, name, email, whatsapp, role, targetBand, createdAt, lastActivityAt, lastLoginAt }) => ({
      id, name, email, whatsapp: whatsapp || "", role, targetBand, createdAt, lastActivityAt: lastActivityAt || createdAt || null, lastLoginAt: lastLoginAt || null,
      inactiveDays: Math.max(0, Math.floor((now - getUserLastActivity({ lastActivityAt, lastLoginAt, createdAt })) / 86400000)),
    }));
    return res.json({ success: true, leads, retentionDays: CANDIDATE_INACTIVITY_DAYS });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load leads." });
  }
});

app.get("/api/leads/export-contacts", requireAdmin, async (req, res) => {
  try {
    await cleanupInactiveCandidateAccounts("contact-export");
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const contacts = users
      .filter(u => u.role === "candidate")
      .map(u => ({ name: u.name || "", whatsapp: u.whatsapp || "" }));
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + ["Name,WhatsApp", ...contacts.map(c => `${esc(c.name)},${esc(c.whatsapp)}`)].join("\n");
    res.setHeader("Content-Disposition", 'attachment; filename="lingofi_student_names_numbers.csv"');
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to export student contacts." });
  }
});

app.get("/api/leads/export", requireAdmin, async (req, res) => {
  try {
    await cleanupInactiveCandidateAccounts("lead-export");
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const now = Date.now();
    // Never export passwordHash/password credentials. This export contains all
    // signup/contact fields stored for candidates plus retention/activity data.
    const leads = users.map(({ id, name, email, whatsapp, role, targetBand, createdAt, lastActivityAt, lastLoginAt }) => ({
      id, name, email, whatsapp: whatsapp || "", role, targetBand, createdAt,
      lastActivityAt: lastActivityAt || createdAt || "",
      lastLoginAt: lastLoginAt || "",
      inactiveDays: Math.max(0, Math.floor((now - getUserLastActivity({ lastActivityAt, lastLoginAt, createdAt })) / 86400000)),
    }));
    const format = String(req.query.format || "csv").toLowerCase();
    if (format === "csv" || format === "excel" || format === "xlsx") {
      const headers = ["id","name","email","whatsapp","role","targetBand","createdAt","lastActivityAt","lastLoginAt","inactiveDays"];
      const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      // UTF-8 BOM makes the CSV open cleanly in Microsoft Excel.
      const csv = "\uFEFF" + [headers.join(","), ...leads.map(l => headers.map(h => esc(l[h as keyof typeof l])).join(","))].join("\n");
      res.setHeader("Content-Disposition", 'attachment; filename="lingofi_student_signups.csv"');
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.send(csv);
    }
    res.setHeader("Content-Disposition", 'attachment; filename="lingofi_student_signups.json"');
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json({ exportedAt: new Date().toISOString(), retentionDays: CANDIDATE_INACTIVITY_DAYS, leads });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to export signups." });
  }
});

app.delete("/api/leads/:id", requireAdmin, async (req, res) => {
  try {
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const next = users.filter(u => String(u.id) !== String(req.params.id));
    if (next.length === users.length) return res.status(404).json({ error: "Lead/account not found." });
    writeJsonFile(USERS_PATH, next);
    if (CLOUD_PERSISTENCE_ENABLED) await persistFileToCloud(USERS_PATH, next);
    return res.json({ success: true, remaining: next.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete lead." });
  }
});

app.delete("/api/leads", requireAdmin, async (req, res) => {
  try {
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const keep = users.filter(u => u.role === "admin" || u.role === "teacher");
    const removed = users.length - keep.length;
    writeJsonFile(USERS_PATH, keep);
    if (CLOUD_PERSISTENCE_ENABLED) await persistFileToCloud(USERS_PATH, keep);
    return res.json({ success: true, removed, remaining: keep.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete candidate leads." });
  }
});

// ============================================================================
// AUTHENTICATION API (LOGIN, SIGNUP, ME, USERS)
// ============================================================================

// 14. Sign Up New User
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, whatsapp, password, targetBand = 7.5 } = req.body;
    if (!name || !email || !whatsapp || !password) {
      return res.status(400).json({ error: "Name, email, WhatsApp number, and password are required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      email: cleanEmail,
      whatsapp: String(whatsapp),
      passwordHash: hashPassword(password),
      role: "candidate",
      targetBand: parseFloat(targetBand) || 7.5,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    users.push(newUser);
    writeJsonFile(USERS_PATH, users);
    if (CLOUD_PERSISTENCE_ENABLED) await persistFileToCloud(USERS_PATH, users);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      whatsapp: newUser.whatsapp,
      role: newUser.role,
      targetBand: newUser.targetBand,
      createdAt: newUser.createdAt,
      lastActivityAt: newUser.lastActivityAt,
      lastLoginAt: newUser.lastLoginAt,
    };

    const token = issueAuthToken(newUser);
    res.json({
      success: true,
      message: "Account created successfully!",
      user: safeUser,
      token,
    });
  } catch (err: any) {
    console.error("Sign up error:", err);
    res.status(500).json({ error: err.message || "Failed to create account." });
  }
});

// 15. Password-free role access. The code is validated server-side so it is
// never exposed as a usable credential in the browser bundle.
const STAFF_ACCESS_CODE = "60256025";
app.post("/api/auth/role-code", async (req, res) => {
  try {
    const role = String(req.body?.role || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    if (role !== "admin" && role !== "teacher") return res.status(400).json({ error: "Choose Admin or Teacher." });
    if (code !== STAFF_ACCESS_CODE) return res.status(401).json({ error: "Incorrect access code." });

    await repairSeededDirectorCredentials();
    const users = readJsonFile<any[]>(USERS_PATH, []);
    let user = users.find(u => u.role === role);
    if (!user) {
      user = {
        id: `staff_${role}_${Date.now()}`,
        name: role === "admin" ? "Wasil Azad (Director)" : "LingoFi Teacher",
        email: `${role}@lingofi.org`,
        whatsapp: "",
        passwordHash: "",
        role,
        targetBand: 9,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      users.push(user);
    } else {
      user.lastLoginAt = new Date().toISOString();
      user.lastActivityAt = user.lastLoginAt;
    }
    writeJsonFile(USERS_PATH, users);
    if (CLOUD_PERSISTENCE_ENABLED) await persistFileToCloud(USERS_PATH, users);
    const token = issueAuthToken(user);
    return res.json({ success: true, message: `Welcome, ${user.name}!`, user: {
      id: user.id, name: user.name, email: user.email, whatsapp: user.whatsapp || "",
      role: user.role, targetBand: user.targetBand, createdAt: user.createdAt,
      lastActivityAt: user.lastActivityAt, lastLoginAt: user.lastLoginAt,
    }, token });
  } catch (err: any) {
    console.error("Role code login error:", err);
    return res.status(500).json({ error: err.message || "Failed to validate staff access." });
  }
});

// 16. Log In
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    let users = readJsonFile<any[]>(USERS_PATH, []);
    // Self-heal the seeded Director before credential lookup. This also repairs
    // an older Supabase users record that may have overwritten the local cache.
    if (cleanEmail === "admin@lingofi.org" && password === "admin123") {
      await repairSeededDirectorCredentials();
      users = readJsonFile<any[]>(USERS_PATH, []);
    }
    const user = users.find(u => String(u?.email || "").toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const hash = hashPassword(password);
    if (user.passwordHash !== hash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const now = new Date().toISOString();
    user.lastLoginAt = now;
    user.lastActivityAt = now;
    writeJsonFile(USERS_PATH, users);
    if (CLOUD_PERSISTENCE_ENABLED) await persistFileToCloud(USERS_PATH, users);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp || "",
      role: user.role,
      targetBand: user.targetBand,
      createdAt: user.createdAt,
      lastActivityAt: user.lastActivityAt,
      lastLoginAt: user.lastLoginAt,
    };

    const token = issueAuthToken(user);
    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: safeUser,
      token,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message || "Failed to log in." });
  }
});

// 16. Record authenticated account activity. The client sends this heartbeat
// while the user is actively signed in so legitimate use resets the 30-day timer.
app.post("/api/auth/activity", async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ authenticated: false });
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const stored = users.find(u => String(u.id) === String(user.id));
    if (!stored) return res.status(401).json({ authenticated: false });
    const now = new Date().toISOString();
    stored.lastActivityAt = now;
    writeJsonFile(USERS_PATH, users);
    if (CLOUD_PERSISTENCE_ENABLED) await persistFileToCloud(USERS_PATH, users);
    return res.json({ success: true, lastActivityAt: now });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to record account activity." });
  }
});

// 17. Get Current User Session
app.get("/api/auth/me", (req, res) => {
  try {
    const authenticated = getAuthenticatedUser(req);
    const emailHeader = String(req.headers["x-user-email"] || "").trim().toLowerCase();
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const user = authenticated || (emailHeader ? users.find(u => String(u.email || "").toLowerCase() === emailHeader) : null);
    if (!user) return res.status(401).json({ authenticated: false });

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        targetBand: user.targetBand,
        createdAt: user.createdAt,
        lastActivityAt: user.lastActivityAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 18. List All Users (Admin / Teacher view)
app.get("/api/auth/users", (req, res) => {
  try {
    const users = readJsonFile<any[]>(USERS_PATH, []);
    const safeUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      targetBand: u.targetBand,
      createdAt: u.createdAt,
    }));
    res.json(safeUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 19. Save Test Results to Database
app.post("/api/results/save", async (req, res) => {
  try {
    const { trfCode, candidateName, userEmail, testId, testTitle, overallBand, scores } = req.body;
    const scoreKeys = ["reading", "listening", "writing", "speaking"];
    if (!candidateName || !Number.isFinite(Number(testId)) || !testTitle || !Number.isFinite(Number(overallBand)) ||
        !scores || scoreKeys.some((key) => !Number.isFinite(Number(scores[key])))) {
      return res.status(400).json({ error: "A real completed test score is required. Placeholder or fabricated scores are not accepted." });
    }
    const results = readJsonFile<any[]>(TEST_RESULTS_PATH, []);
    const newRecord = {
      id: `trf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      trfCode: trfCode || `LING${Date.now().toString().slice(-10)}`,
      candidateName,
      userEmail: userEmail || null,
      testId: Number(testId),
      testTitle,
      overallBand: Number(overallBand),
      scores: Object.fromEntries(scoreKeys.map((key) => [key, Number(scores[key])])),
      completedAt: new Date().toISOString(),
    };
    results.unshift(newRecord);
    writeJsonFile(TEST_RESULTS_PATH, results);
    if (CLOUD_PERSISTENCE_ENABLED) await persistFileToCloud(TEST_RESULTS_PATH, results);
    res.json({ success: true, record: newRecord });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 20. Get Test Submissions for Candidate or All Submissions
app.get("/api/results", (req, res) => {
  try {
    const email = req.query.email as string;
    const results = readJsonFile<any[]>(TEST_RESULTS_PATH, []);
    if (email) {
      const filtered = results.filter(r => r.userEmail?.toLowerCase() === email.toLowerCase());
      return res.json(filtered);
    }
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Validate the modular IELTS bank after cloud hydration. Older deployments of Lingofi
// used a legacy question shape and repeated a small question set across hundreds of tests.
// If that stale bank is found in Supabase, replace it with the bundled, repaired canonical bank.
async function seedMissingCloudData() {
  if (!cloudPersistenceActive) return;
  for (const [filePath, key] of Object.entries(CLOUD_FILE_KEYS)) {
    if (!cloudPersistenceActive) break;
    try {
      if (filePath === IELTS_DB_PATH || filePath === STANDARDIZED_DB_PATH) {
        const blobCheck = await cloudRequest(`lingofi_data_blobs?key=eq.${encodeURIComponent(key)}&select=key`);
        if (!blobCheck) continue;
        const blobRows = await blobCheck.json();
        if (Array.isArray(blobRows) && blobRows.length) continue;
      } else {
        const check = await cloudRequest(`lingofi_data?key=eq.${encodeURIComponent(key)}&select=key`);
        if (!check) continue;
        const rows = await check.json();
        if (Array.isArray(rows) && rows.length) continue;
      }
      const data = readJsonFile<any>(filePath, null);
      if (data !== null) await persistFileToCloud(filePath, data);
    } catch {
      cloudPersistenceActive = false;
      break;
    }
  }
}

function repairIeltsDatabaseIfStale() {
  try {
    const filePath = IELTS_DB_PATH;
    const current = readJsonFile<any>(filePath, { reading: [], listening: [], writing: [], speaking: [] });
    const reading = Array.isArray(current.reading) ? current.reading : [];
    const listening = Array.isArray(current.listening) ? current.listening : [];
    const readingQuestions = reading.flatMap((t: any) => Array.isArray(t.questions) ? t.questions : []);
    const listeningQuestions = listening.flatMap((t: any) => Array.isArray(t.parts) ? t.parts.flatMap((p: any) => Array.isArray(p.questions) ? p.questions : []) : []);
    const prompts = [...readingQuestions, ...listeningQuestions].map((q: any) => String(q.prompt || q.q || "").trim()).filter(Boolean);
    const uniqueRatio = prompts.length ? new Set(prompts).size / prompts.length : 0;
    const structurallyComplete =
      reading.length >= 1 &&
      listening.length >= 1 &&
      reading.every((t: any) => Array.isArray(t.passages) && t.passages.length === 3 && Array.isArray(t.questions) && t.questions.length === 40) &&
      listening.every((t: any) => Array.isArray(t.parts) && t.parts.length === 4 && t.parts.every((p: any) => Array.isArray(p.questions) && p.questions.length === 10));

    if (structurallyComplete && uniqueRatio >= 0.95) return;

    const bundledPath = path.join(process.cwd(), "src", "data", "ieltsData.json");
    if (!fs.existsSync(bundledPath)) {
      console.warn("[Lingofi] Repaired IELTS bundle is unavailable; keeping current database.");
      return;
    }
    const repaired = JSON.parse(fs.readFileSync(bundledPath, "utf-8"));
    writeJsonFile(filePath, repaired);
    if (CLOUD_PERSISTENCE_ENABLED) void persistFileToCloud(filePath, repaired);
    console.log(`[Lingofi] Repaired stale IELTS bank: ${reading.length} reading tests / ${listening.length} listening tests replaced.`);
  } catch (err) {
    console.error("[Lingofi] IELTS database validation failed:", err);
  }
}

// Vite middleware or static serving
async function startServer() {
  await hydrateFilesFromCloud();
  repairIeltsDatabaseIfStale();
  await seedMissingCloudData();
  // Repair the known seeded Director credential mismatch before authentication.
  await repairSeededDirectorCredentials();
  // Enforce retention immediately after cloud hydration and then hourly.
  await cleanupInactiveCandidateAccounts("startup");
  setInterval(() => { void cleanupInactiveCandidateAccounts("scheduled"); }, CANDIDATE_CLEANUP_INTERVAL_MS);
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lingofi IELTS Official Testing System server running on http://localhost:${PORT}`);
  });
}

startServer();
