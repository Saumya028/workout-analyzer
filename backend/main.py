# backend/main.py
# ──────────────────────────────────────────────────────────────────────────────
# FastAPI entry point for the FormIQ Workout Analyzer backend.
#
# Run with:
#   cd backend
#   pip install -r requirements.txt
#   uvicorn main:app --reload --port 8000
# ──────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as api_router
from .api.websocket import ws_router

app = FastAPI(
    title="FormIQ — Workout Analyzer API",
    description="Real-time rep detection and accuracy scoring using sensor data.",
    version="1.0.0",
)

# ── CORS — allow the Next.js frontend to call us ─────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routes ──────────────────────────────────────────────────────────
app.include_router(api_router)
app.include_router(ws_router)


@app.get("/")
async def root():
    return {
        "name": "FormIQ Workout Analyzer API",
        "version": "1.0.0",
        "endpoints": {
            "POST /api/workout": "Analyze a workout from sensor data",
            "GET  /api/workout": "Fetch workout history",
            "GET  /api/exercises": "List available exercises",
            "POST /api/simulate": "Generate & analyze simulated data",
            "WS   /ws/workout": "Real-time WebSocket workout tracking",
        },
    }
