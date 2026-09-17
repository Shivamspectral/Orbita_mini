# Astra Orbita Mini — FastAPI backend

FastAPI is the server-side application/API layer for Astra Orbita Mini. Vercel serves this application under `/api` in the same project as the existing frontend.

## Architecture

```text
Browser
  ↓
Vercel frontend
  ↓ /api/* (same origin)
FastAPI
  ↓ service-role connection (server-side only)
Supabase PostgreSQL + Storage
```

## Local development

1. Copy `.env.example` to `.env`.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
3. Install dependencies:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

4. For a backend-only local run:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For the closest production-like setup, use `vercel dev` from the project root so the frontend and `/api` routes share one origin.

## Authentication

Authentication uses the existing database-backed `scms_members` + `scms_sessions` model. Login calls the `scms_login` RPC and authenticated requests validate sessions through `scms_session_member`.

The Supabase service-role key is server-side only. It must never be placed in `index.html`, `api-config.js`, or any other browser-delivered file.

## Authorization

FastAPI is the authoritative authorization layer because the service-role connection bypasses Supabase RLS.

Stable security levels:

- `MEMBER` — standard council member access.
- `LEAD` — elevated council management access.
- `SUPER_ADMIN` — full current-release administrative access; used by the Principal.

Human `role_name` values and committee names are descriptive and can change without changing the permission model.

Only enabled council accounts can authenticate. General students are not login accounts.

## Finance

Finance, budget, treasury, and approval workflows are intentionally not active in this release. They are presented as **Coming in a future update** and should not be enabled by treating the existing finance tables as active application functionality.
