# Astra Orbita Mini

Student Council Management System built as a single Vercel full-stack application.

## Architecture

```text
Existing Orbita Mini frontend
          ↓
       Vercel /api
          ↓
       FastAPI
          ↓
Supabase PostgreSQL + Storage
```

The frontend and FastAPI backend are deployed in the **same Vercel project and same origin**. Browser requests use `/api/...`; there is no production `localhost` API URL and no separate backend host is required.

## Project structure

```text
astra_orbita_mini/
├── index.html
├── api-config.js
├── api/index.py
├── backend/
│   ├── app/
│   ├── sql/
│   │   ├── SCHEMA_CHECK.sql
│   │   └── SCMS_AUTHORIZATION_MIGRATION.sql
│   ├── .env.example
│   ├── requirements.txt
│   └── run.ps1 / run.sh
├── requirements.txt
├── manifest.webmanifest
├── sw.js
├── student-council-logo.jpeg
├── vercel.json
└── README.md
```

No old cloud-sync bridge, frontend-only prototype documentation, duplicate base schema dump, generated cache files, or obsolete deployment notes are included.

## Deploy to Vercel

### 1. Import the project

Upload/import this folder as a Vercel project. The project root is the folder containing `index.html`, `api/`, `backend/`, `requirements.txt`, and `vercel.json`.

### 2. Add Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Optional:

```text
COUNCIL_ID=siddhant-scoe-2026
```

Do **not** put the service-role key in frontend files or commit a real `.env` file.

`SUPABASE_URL` has no hardcoded fallback. A missing value intentionally causes the backend to fail clearly instead of silently connecting to an unintended database.

### 3. Deploy

Deploy normally through Vercel. FastAPI is exposed under `/api` by `api/index.py`.

The frontend calls the same origin, so no `ORBITA_API_BASE` production variable is required.

## Supabase setup

The authorization migration has already been designed for the current architecture. If setting up a fresh database or verifying an existing one, review/run:

```text
backend/sql/SCMS_AUTHORIZATION_MIGRATION.sql
```

Use:

```text
backend/sql/SCHEMA_CHECK.sql
```

only to inspect the live schema. It does not modify data.

The authorization migration adds stable fields to `scms_members`:

```text
account_type
authority_level
committee_id
login_enabled
```

### Authority levels

```text
MEMBER → LEAD → SUPER_ADMIN
```

`role_name` remains a human-readable title. Committee names are data, not hard-coded authorization rules, because those names can change from year to year.

The Principal is represented as `SUPER_ADMIN` and keeps `is_super_admin=true`.

General students should not be added as login accounts. A non-login record, if ever needed administratively, should have `login_enabled=false`.

## Security model

FastAPI is the authoritative authorization layer. It validates the database-backed session and then checks the member's stable authority level before protected mutations.

Supabase is accessed by the backend using the service-role key. Because that key bypasses RLS, the application does **not** treat the SQL RLS policies as the primary authorization boundary.

Grievance privacy is enforced server-side:

- standard members see only their permitted grievance records;
- anonymous submissions are stored without the submitter's member identity;
- leads/super-admins can access the broader grievance-management view.

Members can perform only the member-level operations allowed by the API, including legitimate updates to records they are allowed to edit. Lead-level management operations require `LEAD` or `SUPER_ADMIN`.

## Finance / budget

Finance, budgets, treasury actions, and approval workflows are intentionally **not active yet**.

The application presents these areas as:

> **Coming in a future update**

Do not treat the existing finance tables as enabled functionality until the future finance module is implemented.

## Authentication notes

- Login: custom email/username + password through `scms_login`.
- Session: database-backed token stored by the SPA and validated through `scms_session_member`.
- No JWT secret is required by this architecture.
- Supabase service-role credentials remain server-side.

## Local development

For a production-like same-origin setup, use Vercel's local development command from the project root:

```powershell
vercel dev
```

If you only want to run FastAPI directly:

```powershell
cd backend
Copy-Item .env.example .env
# Edit .env and set the Supabase values
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The frontend is intended to be served over HTTP, not opened directly as a `file://` URL.

## Current data policy

The application does not seed fake operational records. Existing `scms_members` data is the source for council login accounts. Tasks, events, meetings, documents, grievances, and other operational records are created through the application as the system is used.

## Important

This repository contains application source and deployment configuration only. Never add real Supabase service-role keys, database passwords, or private deployment credentials to the repository.
