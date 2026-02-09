import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest } from "../util/errors.js";

const putBody = z.object({
  uiLocale: z.enum(["en", "vi", "ja"]).optional(),
  defaultMode: z.enum(["auto", "casual", "friendly", "business"]).optional()
});

export const settingsRoutes = async (app: FastifyInstance) => {
  app.get("/api/v1/settings", async (req) => {
    const user = await requireAuth(req);
    const { rows } = await pool.query(
      "select ui_locale, default_mode from user_settings where user_id=$1 limit 1",
      [user.id]
    );
    if (rows.length === 0) {
      await pool.query(
        "insert into user_settings(user_id, ui_locale, default_mode) values ($1,'en','auto') on conflict (user_id) do nothing",
        [user.id]
      );
      return { uiLocale: "en", defaultMode: "auto" };
    }
    const r = rows[0] as { ui_locale: string; default_mode: string };
    return { uiLocale: r.ui_locale, defaultMode: r.default_mode };
  });

  app.put("/api/v1/settings", async (req) => {
    const user = await requireAuth(req);
    const parsed = putBody.safeParse(req.body);
    if (!parsed.success) throw badRequest("Dữ liệu settings không hợp lệ.");

    const { uiLocale, defaultMode } = parsed.data;
    if (!uiLocale && !defaultMode) throw badRequest("Không có thay đổi.");

    await pool.query(
      `insert into user_settings(user_id, ui_locale, default_mode)
       values ($1, coalesce($2,'en'), coalesce($3,'auto'))
       on conflict (user_id) do update set
         ui_locale = coalesce(excluded.ui_locale, user_settings.ui_locale),
         default_mode = coalesce(excluded.default_mode, user_settings.default_mode),
         updated_at = now()`,
      [user.id, uiLocale ?? null, defaultMode ?? null]
    );

    return { ok: true };
  });
};
