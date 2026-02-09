import { env } from "../env.js";
import { analysisResponseSchema } from "./schemas.js";
import { buildSystemInstruction, buildUserPrompt, type AnalyzeMode } from "./prompt.js";
import { internalError } from "../util/errors.js";

export type AnalysisResult = {
  languageDetected: string;
  summary: string;
  keyPoints: string[];
  replySuggestions: { style: string; text: string }[];
  riskNotes: string[];
};

const endpointForModel = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

const extractCandidateText = (resp: any): string => {
  const t =
    resp?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") ??
    resp?.candidates?.[0]?.content?.parts?.[0]?.text ??
    resp?.candidates?.[0]?.content?.text ??
    resp?.text;
  if (typeof t !== "string" || !t.trim()) throw internalError("Gemini không trả text.");
  return t;
};

const safeJsonParse = (s: string): any => {
  try {
    return JSON.parse(s);
  } catch {
    // attempt salvage: extract the first {...} block
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = s.slice(start, end + 1);
      return JSON.parse(sliced);
    }
    throw new Error("Invalid JSON");
  }
};

export const callGeminiAnalysis = async (args: {
  text: string;
  uiLocale: "en" | "vi" | "ja";
  mode: AnalyzeMode;
}): Promise<AnalysisResult> => {
  const url = endpointForModel(env.geminiModel);
  const systemInstruction = buildSystemInstruction(args.uiLocale);
  const prompt = buildUserPrompt(args.text, args.mode);

  const body = {
    // Shell examples in official docs use snake_case for system_instruction and response_schema keys.
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: "application/json",
      response_schema: analysisResponseSchema
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": env.geminiApiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw internalError(`Gemini HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const candidateText = extractCandidateText(json);
    const parsed = safeJsonParse(candidateText);

    return parsed as AnalysisResult;
  } catch (e: any) {
    if (e?.name === "AbortError") throw internalError("Gemini timeout.");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
};
