from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import CORS_ORIGINS
from app.routers.auth import router as auth_router
from app.routers.resources import router as resource_router


# ============================================================
# PROJECT ROOT
# ============================================================

ROOT = Path(__file__).resolve().parents[2]


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Orbita Mini SCMS API",
    version="2.0.0",
)


# ============================================================
# CORS
# ============================================================
#
# CORS_ORIGINS comes from backend/app/config.py.
#
# The regex additionally allows Capacitor's local WebView
# origins used by the Android application.
#
# Production:
#   https://orbita-mini.vercel.app
#
# Capacitor:
#   https://localhost
#   http://localhost
#   capacitor://localhost
#
# Local development:
#   localhost / 127.0.0.1 with any port
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=(
        r"^(https?://localhost|"
        r"https?://127\.0\.0\.1|"
        r"capacitor://localhost)"
        r"(:\d+)?$"
    ),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "service": "orbita-mini-fastapi",
    }


# ============================================================
# API ROUTERS
# ============================================================

app.include_router(auth_router)
app.include_router(resource_router)


# ============================================================
# FRONTEND
# ============================================================

@app.get("/")
async def root():
    return FileResponse(
        ROOT / "index.html"
    )


# ============================================================
# API CONFIG
# ============================================================

@app.get("/api-config.js")
async def api_config():
    return FileResponse(
        ROOT / "api-config.js",
        media_type="application/javascript",
    )