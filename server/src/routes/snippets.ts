import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest, notFound } from "../util/errors.js";
import { newId } from "../util/crypto.js";

const createBody = z.object({
  title: z.string().max(120).optional(),
  content: z.string().min(1).max(50_000)
});

export const snippetsRoutes = async (app: FastifyInstance) => {
  app.post("/api/v1/snippets", async (req) => {
    const user = await requireAuth(req);
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) throw badRequest("Dữ liệu snippet không hợp lệ.");

    const id = newId();
    const title = parsed.data.title?.trim() ? parsed.data.title.trim() : null;

    await pool.query(
      "insert into snippets(id, user_id, title, content) values ($1,$2,$3,$4)",
      [id, user.id, title, parsed.data.content]
    );

    return { id };
  });

  app.get("/api/v1/snippets", async (req) => {
    const user = await requireAuth(req);
    const { rows } = await pool.query(
      "select id, title, created_at from snippets where user_id=$1 order by created_at desc limit 50",
      [user.id]
    );
    return { items: rows };
  });

  app.get("/api/v1/snippets/:id", async (req) => {
    const user = await requireAuth(req);
    const id = (req.params as any).id as string;
    if (!id) throw badRequest("Thiếu id.");

    const { rows } = await pool.query(
      "select id, title, content, created_at from snippets where id=$1 and user_id=$2 limit 1",
      [id, user.id]
    );
    if (rows.length === 0) throw notFound("Không tìm thấy snippet.");

    return { snippet: rows[0] };
  });

  app.delete("/api/v1/snippets/:id", async (req) => {
    const user = await requireAuth(req);
    const id = (req.params as any).id as string;
    const r = await pool.query("delete from snippets where id=$1 and user_id=$2", [id, user.id]);
    if (r.rowCount === 0) throw notFound("Không tìm thấy snippet.");
    return { ok: true };
  });
};
