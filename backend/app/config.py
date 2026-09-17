import os
from pathlib import Path

from dotenv import load_dotenv


# ============================================================
# PROJECT PATHS
# ============================================================

# config.py
#   backend/
#     app/
#       config.py
#
# parents[0] = backend/app
# parents[1] = backend
# parents[2] = project root

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
ENV_FILE = BACKEND_DIR / ".env"


# ============================================================
# ENVIRONMENT
# ============================================================

# Load backend/.env when running locally.
# On Vercel, environment variables configured in Vercel
# will also be available through os.getenv().
load_dotenv(ENV_FILE)


# ============================================================
# SUPABASE
# ============================================================

SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    ""
).strip().rstrip("/")

if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is required. "
        "Set it in backend/.env or Vercel Environment Variables."
    )


SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    ""
).strip()

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_SERVICE_ROLE_KEY is required. "
        "Set it in backend/.env or Vercel Environment Variables."
    )


# ============================================================
# COUNCIL
# ============================================================

COUNCIL_ID = os.getenv(
    "COUNCIL_ID",
    "siddhant-scoe-2026"
).strip()


# ============================================================
# CORS
# ============================================================

DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "http://localhost:8000,"
    "http://127.0.0.1:8000,"
    "http://localhost:5500,"
    "http://127.0.0.1:5500"
)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        DEFAULT_CORS_ORIGINS
    ).split(",")
    if origin.strip()
]


# ============================================================
# OPTIONAL DEBUG INFORMATION
# ============================================================

# This only checks whether the local .env file exists.
# Never print or expose the service-role key.
ENV_FILE_EXISTS = ENV_FILE.exists()