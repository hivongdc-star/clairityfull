import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";

import { env } from "./env.js";
import { ensureSchema, pool } from "./db.js";
import { AppError } from "./util/errors.js";

import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { snippetsRoutes } from "./routes/snippets.js";
import { settingsRoutes } from "./routes/settings.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; email: string };
  }
}

const app = Fastify({
  logger: true,
  trustProxy: true
});

await ensureSchema();

await app.register(cookie, {
  // if you later add a COOKIE_SECRET, set it here for signing
});

if (env.allowedOrigins.length > 0) {
  await app.register(cors, {
    origin: (origin, cb) => {
      // allow non-browser tools (no Origin header)
      if (!origin) return cb(null, true);
      if (env.allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true
  });
}

await healthRoutes(app);
await authRoutes(app);
await analyzeRoutes(app);
await snippetsRoutes(app);
await settingsRoutes(app);

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof AppError) {
    reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
    return;
  }

  // zod/validation/plugin errors
  if ((err as any)?.statusCode && typeof (err as any).statusCode === "number") {
    reply.status((err as any).statusCode).send({
      error: { code: "FASTIFY_ERROR", message: (err as any).message ?? "Request error." }
    });
    return;
  }

  app.log.error({ err }, "Unhandled error");
  reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: "Lỗi hệ thống." } });
});

const start = async () => {
  try {
    await app.listen({ host: env.host, port: env.port });
  } catch (e) {
    app.log.error(e);
    process.exit(1);
  }
};

const shutdown = async () => {
  try {
    await app.close();
    await pool.end();
  } catch {
    // ignore
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await start();
