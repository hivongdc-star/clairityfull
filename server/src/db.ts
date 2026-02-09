import pg from "pg";
import { env } from "./env.js";
import { schemaSql } from "./schema.js";

const { Pool } = pg;

const shouldUseSsl = (databaseUrl: string) => {
  const u = databaseUrl.toLowerCase();
  return u.includes("sslmode=require") || u.includes("supabase.com");
};

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: shouldUseSsl(env.databaseUrl) ? { rejectUnauthorized: false } : undefined,
  max: 5
});

export const ensureSchema = async () => {
  for (const sql of schemaSql) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(sql);
  }
};

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
};

export type DbSettings = {
  user_id: string;
  ui_locale: string;
  default_mode: string;
};

export type DbSnippet = {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
};

export type DbAnalysis = {
  id: string;
  user_id: string;
  snippet_id: string | null;
  mode: string;
  input_text: string;
  result_json: any;
  created_at: string;
};
