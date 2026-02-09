import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest } from "../util/errors.js";
import { newId } from "../util/crypto.js";
import { callGeminiAnalysis } from "../gemini/client.js";
import type { AnalyzeMode } from "../gemini/prompt.js";

const bodySchema = z.object({
  text: z.string().min(1),
  mode: z.enum(["auto", "casual", "friendly", "business"]).optional(),
  save: z.boolean().optional(),
  snippetId: z.string().uuid().optional()
});

const resolveSettings = async (userId: string) => {
  const { rows } = await pool.query(
    "select ui_locale, default_mode from user_settings where user_id=$1 limit 1",
    [userId]
  );

  if (rows.length > 0) {
    const r = rows[0] as { ui_locale: string; default_mode: string };
    const uiLocale = (r.ui_locale === "ja" || r.ui_locale === "vi" || r.ui_locale === "en"
      ? r.ui_locale
      : "en") as "en" | "vi" | "ja";

    const defaultMode =
      (r.default_mode === "auto" ||
      r.default_mode === "casual" ||
      r.default_mode === "friendly" ||
      r.default_mode === "business"
        ? r.default_mode
        : "auto") as AnalyzeMode;

    return { uiLocale, defaultMode };
  }

  await pool.query(
    "insert into user_settings(user_id, ui_locale, default_mode) values ($1,'en','auto') on conflict (user_id) do nothing",
    [userId]
  );
  return { uiLocale: "en" as const, defaultMode: "auto" as const };
};

export const analyzeRoutes = async (app: FastifyInstance) => {
  app.post("/api/v1/analyze", async (req) => {
    const user = await requireAuth(req);

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Dữ liệu không hợp lệ.");

    const { text, save, snippetId } = parsed.data;
    if (text.length > env.maxInputChars) {
      throw badRequest(`Nội dung quá dài (tối đa ${env.maxInputChars} ký tự).`, "TEXT_TOO_LONG");
    }

    const { uiLocale, defaultMode } = await resolveSettings(user.id);
    const mode = (parsed.data.mode ?? defaultMode) as AnalyzeMode;

    if (snippetId) {
      const sn = await pool.query(
        "select id from snippets where id=$1 and user_id=$2 limit 1",
        [snippetId, user.id]
      );
      if (sn.rows.length === 0) throw badRequest("snippetId không tồn tại hoặc không thuộc về bạn.");
    }

    const result = await callGeminiAnalysis({ text, uiLocale, mode });

    let analysisId: string | undefined;

    if (save || snippetId) {
      analysisId = newId();
      await pool.query(
        "insert into analyses(id, user_id, snippet_id, mode, input_text, result_json) values ($1,$2,$3,$4,$5,$6)",
        [analysisId, user.id, snippetId ?? null, mode, text, result]
      );
    }

    return { analysisId, result, mode, uiLocale };
  });
};
