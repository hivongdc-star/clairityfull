// REST `generationConfig.response_schema` uses the Gemini Schema object.
// In the official curl example, types are UPPERCASE (OBJECT, ARRAY, STRING, INTEGER, NUMBER, BOOLEAN).
// See: https://ai.google.dev/api/generate-content (JSON Mode / GenerationConfig examples)

export const analysisResponseSchema = {
  type: "OBJECT",
  properties: {
    languageDetected: { type: "STRING", description: "ja | en | vi | mixed | unknown" },
    summary: { type: "STRING", description: "Tóm tắt ngắn." },
    keyPoints: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Các điểm chính (bullet)."
    },
    replySuggestions: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "OBJECT",
        properties: {
          style: {
            type: "STRING",
            description: "casual | friendly | business_jp"
          },
          text: {
            type: "STRING",
            description: "Câu trả lời gợi ý, tự nhiên."
          }
        },
        required: ["style", "text"]
      }
    },
    riskNotes: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Các lưu ý rủi ro (nếu có)."
    }
  },
  required: ["languageDetected", "summary", "keyPoints", "replySuggestions", "riskNotes"]
} as const;
