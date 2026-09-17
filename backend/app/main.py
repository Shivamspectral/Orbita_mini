from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path

from app.config import CORS_ORIGINS
from app.routers.auth import router as auth_router
from app.routers.resources import router as resource_router


ROOT = Path(__file__).resolve().parents[2]

app = FastAPI(
    title='Orbita Mini SCMS API',
    version='2.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ['*'] else ['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*']
)


@app.get('/api/health')
async def health():
    return {
        'ok': True,
        'service': 'orbita-mini-fastapi'
    }


app.include_router(auth_router)
app.include_router(resource_router)


@app.get('/')
async def root():
    return FileResponse(ROOT / 'index.html')


@app.get('/api-config.js')
async def api_config():
    return FileResponse(
        ROOT / 'api-config.js',
        media_type='application/javascript'
    )