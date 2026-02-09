export const schemaSql = [
  // Users
  `
  CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  // Sessions
  `
  CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash text NOT NULL,
    user_agent text,
    ip text,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
  `,
  // User settings
  `
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ui_locale text NOT NULL DEFAULT 'en',
    default_mode text NOT NULL DEFAULT 'auto',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  // Snippets
  `
  CREATE TABLE IF NOT EXISTS snippets (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title text,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS snippets_user_id_idx ON snippets(user_id);
  `,
  // Analyses
  `
  CREATE TABLE IF NOT EXISTS analyses (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snippet_id uuid REFERENCES snippets(id) ON DELETE SET NULL,
    mode text NOT NULL,
    input_text text NOT NULL,
    result_json jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON analyses(user_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS analyses_snippet_id_idx ON analyses(snippet_id);
  `
] as const;
