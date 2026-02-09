# Clairity (Full)

**Goal:** Run a self-hosted "relationship clarity" app on a VPS (IPv4) with **login required**, **default English**, and **Supabase Postgres**.

This bundle includes:
- `server/Clairity.Api` — ASP.NET Core (.NET 8) API + built-in SPA UI (served from `/`)
- `deploy/` — Docker Compose for one-command deployment
- `server/Clairity.Api/wwwroot` — static UI (no separate client build needed)

## Quick start (VPS) — Docker (recommended)

1. Copy `.env.example` to `.env` and fill:
   - `DATABASE_URL` (Supabase Postgres URL)
   - `AI_API_KEY` (Gemini API key)
   - `JWT_SIGNING_KEY` (>= 32 chars)

2. Run:

```bash
cd deploy
docker compose up -d --build
```

3. Open in browser:

- `http://<YOUR_IPV4>:4000/`

> The UI is served from the same API host/port, so no client install is needed.

## Ports

- API + UI: `4000` (IPv4)

## API base

- `/api/v1`

## Health

- `/health/live`
- `/health/ready`

