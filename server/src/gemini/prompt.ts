export type AnalyzeMode = "auto" | "casual" | "friendly" | "business";

export const buildSystemInstruction = (uiLocale: "en" | "vi" | "ja") => {
  const localeNote =
    uiLocale === "ja"
      ? "Write summary/keyPoints in Japanese."
      : uiLocale === "vi"
        ? "Write summary/keyPoints in Vietnamese."
        : "Write summary/keyPoints in English.";

  return [
    "You are an assistant for business communication in Japan.",
    "Return ONLY valid JSON that matches the provided schema. No markdown, no extra keys.",
    "replySuggestions must be an array of EXACTLY 3 items, in this order:",
    '1) style="casual": short and natural, casual tone.',
    '2) style="friendly": warm but still polite.',
    '3) style="business_jp": very polite Japanese (丁寧語/敬語), appropriate for real business in Japan.',
    "The business_jp text must be Japanese, even if input is not Japanese.",
    localeNote,
    "riskNotes: if no risks, return an empty array."
  ].join("\n");
};

export const buildUserPrompt = (text: string, mode: AnalyzeMode) => {
  const modeHint =
    mode === "business"
      ? "Prioritize business_jp style."
      : mode === "casual"
        ? "Prioritize casual style."
        : mode === "friendly"
          ? "Prioritize friendly style."
          : "Choose appropriate tones.";

  return [
    "Analyze the following message and suggest replies.",
    modeHint,
    "Message:",
    text
  ].join("\n");
};
