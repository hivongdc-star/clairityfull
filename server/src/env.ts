import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(10),
  GEMINI_API_KEY: z.string().min(10),
  JWT_ACCESS_SECRET: z.string().min(16),

  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(5000),

  REFRESH_COOKIE_NAME: z.string().default("clairity_rt"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECURE: z.string().default("false"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(8000),

  ALLOWED_ORIGINS: z.string().default("")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. Check server/.env");
}

const raw = parsed.data;

export const env = {
  databaseUrl: raw.DATABASE_URL,
  geminiApiKey: raw.GEMINI_API_KEY,
  jwtAccessSecret: raw.JWT_ACCESS_SECRET,

  host: raw.HOST,
  port: raw.PORT,

  refreshCookieName: raw.REFRESH_COOKIE_NAME,
  refreshTokenTtlDays: raw.REFRESH_TOKEN_TTL_DAYS,
  cookieSecure: raw.COOKIE_SECURE.trim().toLowerCase() === "true",
  cookieSameSite: raw.COOKIE_SAMESITE,

  accessTokenTtlSeconds: raw.ACCESS_TOKEN_TTL_SECONDS,

  geminiModel: raw.GEMINI_MODEL,
  maxInputChars: raw.MAX_INPUT_CHARS,

  allowedOrigins: raw.ALLOWED_ORIGINS
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
} as const;
