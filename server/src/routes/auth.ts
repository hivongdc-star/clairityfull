import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { z } from "zod";
import { pool } from "../db.js";
import { env } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest, unauthorized } from "../util/errors.js";
import { newId, newRefreshToken, sha256Hex } from "../util/crypto.js";
import { signAccessToken } from "../util/jwt.js";

const emailSchema = z
  .string()
  .email()
  .transform((s) => s.trim().toLowerCase());

const passwordSchema = z.string().min(8).max(128);

const registerBody = z.object({
  email: emailSchema,
  password: passwordSchema
});

const loginBody = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
});

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: "/api/v1/auth/refresh" as const,
  maxAge: env.refreshTokenTtlDays * 24 * 60 * 60
});

export const authRoutes = async (app: FastifyInstance) => {
  app.post("/api/v1/auth/register", async (req, reply) => {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) throw badRequest("Dữ liệu đăng ký không hợp lệ.");

    const { email, password } = parsed.data;

    const id = newId();
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    try {
      await pool.query(
        "insert into users(id, email, password_hash) values ($1,$2,$3)",
        [id, email, passwordHash]
      );
      await pool.query(
        "insert into user_settings(user_id, ui_locale, default_mode) values ($1,'en','auto') on conflict (user_id) do nothing",
        [id]
      );
    } catch (e: any) {
      // 23505 = unique_violation
      if (e?.code === "23505") throw badRequest("Email đã được sử dụng.");
      throw e;
    }

    reply.code(201);
    return { ok: true };
  });

  app.post("/api/v1/auth/login", async (req, reply) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) throw badRequest("Dữ liệu đăng nhập không hợp lệ.");

    const { email, password } = parsed.data;

    const { rows } = await pool.query(
      "select id, email, password_hash from users where email=$1 limit 1",
      [email]
    );
    if (rows.length === 0) throw unauthorized("Email hoặc mật khẩu không đúng.");

    const user = rows[0] as { id: string; email: string; password_hash: string };

    const ok = await argon2.verify(user.password_hash, password);
    if (!ok) throw unauthorized("Email hoặc mật khẩu không đúng.");

    const refresh = newRefreshToken();
    const refreshHash = sha256Hex(refresh);

    const sessionId = newId();
    const userAgent = req.headers["user-agent"]?.toString() ?? null;
    const ip =
      (req.headers["x-forwarded-for"]?.toString().split(",")[0] ?? req.ip) || null;

    await pool.query(
      "insert into sessions(id, user_id, refresh_token_hash, user_agent, ip) values ($1,$2,$3,$4,$5)",
      [sessionId, user.id, refreshHash, userAgent, ip]
    );

    reply.setCookie(env.refreshCookieName, refresh, cookieOptions());

    const accessToken = signAccessToken({ sub: user.id, email: user.email });

    return {
      accessToken,
      user: { id: user.id, email: user.email }
    };
  });

  app.post("/api/v1/auth/refresh", async (req, reply) => {
    const refresh = (req.cookies as any)?.[env.refreshCookieName] as string | undefined;
    if (!refresh) throw unauthorized("Phiên đăng nhập đã hết hạn.");

    const refreshHash = sha256Hex(refresh);

    const { rows } = await pool.query(
      `select s.id as session_id, s.user_id, u.email
       from sessions s
       join users u on u.id = s.user_id
       where s.refresh_token_hash = $1 and s.revoked_at is null
       limit 1`,
      [refreshHash]
    );

    if (rows.length === 0) throw unauthorized("Phiên đăng nhập đã hết hạn.");

    const row = rows[0] as { session_id: string; user_id: string; email: string };

    // rotate refresh token
    const newRefresh = newRefreshToken();
    const newHash = sha256Hex(newRefresh);

    await pool.query(
      "update sessions set refresh_token_hash=$1, last_used_at=now() where id=$2",
      [newHash, row.session_id]
    );

    reply.setCookie(env.refreshCookieName, newRefresh, cookieOptions());

    const accessToken = signAccessToken({ sub: row.user_id, email: row.email });
    return { accessToken };
  });

  app.post("/api/v1/auth/logout", async (req, reply) => {
    const refresh = (req.cookies as any)?.[env.refreshCookieName] as string | undefined;
    if (refresh) {
      const refreshHash = sha256Hex(refresh);
      await pool.query(
        "update sessions set revoked_at=now() where refresh_token_hash=$1 and revoked_at is null",
        [refreshHash]
      );
    }

    reply.clearCookie(env.refreshCookieName, { path: "/api/v1/auth/refresh" });
    return { ok: true };
  });

  app.get("/api/v1/auth/me", async (req) => {
    const user = await requireAuth(req);
    return { user };
  });
};
