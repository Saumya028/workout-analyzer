# backend/api/routes.py
# ──────────────────────────────────────────────────────────────────────────────
# REST API endpoints for the workout analyzer.
# ──────────────────────────────────────────────────────────────────────────────

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..rep_detection.detector import analyze_workout
from ..rep_detection.signal_utils import generate_test_data
from ..golden_rep_engine.templates import (
    GOLDEN_REP_TEMPLATES,
    EXERCISE_KEYS,
    EXERCISE_LIST,
)
from ..golden_rep_engine.calibration import (
    save_user_golden_rep,
    load_user_golden_rep,
    delete_user_golden_rep,
    list_user_calibrations,
)

router = APIRouter(prefix="/api")

# Simple JSON file storage (lightweight alternative to MongoDB)
STORAGE_DIR = Path(__file__).resolve().parent.parent / "data"
HISTORY_FILE = STORAGE_DIR / "workout_history.json"


def _load_history() -> list[dict]:
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return []


def _save_history(history: list[dict]) -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2, default=str)


# ── Request / Response models ────────────────────────────────────────────────

class SensorFrame(BaseModel):
    time: float
    ax: float
    ay: float
    az: float
    gx: float
    gy: float
    gz: float


class WorkoutRequest(BaseModel):
    exercise: str
    sensorData: list[SensorFrame]


class CalibrationRequest(BaseModel):
    exercise: str
    sensorData: list[SensorFrame]
    repsToRecord: int = 3


# ── POST /api/workout — Analyze a workout ────────────────────────────────────

@router.post("/workout")
async def post_workout(body: WorkoutRequest):
    if body.exercise not in EXERCISE_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid exercise. Must be one of: {', '.join(EXERCISE_KEYS)}",
        )

    if len(body.sensorData) < 10:
        raise HTTPException(
            status_code=400,
            detail="Insufficient sensor data. Minimum 10 frames required.",
        )

    frames = [f.model_dump() for f in body.sensorData]
    analysis = analyze_workout(frames, body.exercise)

    # Calculate duration
    sorted_frames = sorted(frames, key=lambda f: f["time"])
    duration_ms = (
        sorted_frames[-1]["time"] - sorted_frames[0]["time"]
        if len(sorted_frames) > 1
        else 0
    )

    # Store in history
    workout_id = str(uuid.uuid4())[:8]
    record = {
        "id": workout_id,
        "exercise": body.exercise,
        "reps": analysis["reps"],
        "accuracy": analysis["accuracy"],
        "rep_scores": analysis["rep_scores"],
        "detected_segments": analysis["detected_segments"],
        "duration_ms": duration_ms,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    history = _load_history()
    history.insert(0, record)
    history = history[:100]  # keep last 100
    _save_history(history)

    return {
        "reps": analysis["reps"],
        "accuracy": analysis["accuracy"],
        "repScores": analysis["rep_scores"],
        "detectedSegments": analysis["detected_segments"],
        "goldenSignal": analysis["golden_signal"],
        "userSignals": analysis["user_signals"],
        "workoutId": workout_id,
        "message": f"Detected {analysis['reps']} reps with {analysis['accuracy']}% accuracy.",
    }


# ── GET /api/workout — Fetch workout history ─────────────────────────────────

@router.get("/workout")
async def get_workouts(exercise: str | None = None, limit: int = 20):
    history = _load_history()

    if exercise and exercise in EXERCISE_KEYS:
        history = [w for w in history if w["exercise"] == exercise]

    return {"workouts": history[: min(limit, 100)]}


# ── GET /api/exercises — List available exercises ─────────────────────────────

@router.get("/exercises")
async def get_exercises():
    return {"exercises": EXERCISE_LIST}


# ── POST /api/simulate — Generate + analyse simulated data ───────────────────

@router.post("/simulate")
async def simulate_workout(exercise: str = "squats", reps: int = 5):
    if exercise not in EXERCISE_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid exercise. Must be one of: {', '.join(EXERCISE_KEYS)}",
        )

    reps = max(1, min(reps, 20))
    frames = generate_test_data(exercise, reps)
    analysis = analyze_workout(frames, exercise)

    return {
        "exercise": exercise,
        "requested_reps": reps,
        "detected_reps": analysis["reps"],
        "accuracy": analysis["accuracy"],
        "rep_scores": analysis["rep_scores"],
        "golden_signal": analysis["golden_signal"],
        "user_signals": analysis["user_signals"],
        "frame_count": len(frames),
    }


# ── POST /api/calibrate — Record a personal golden rep ───────────────────────

@router.post("/calibrate")
async def calibrate_golden_rep(body: CalibrationRequest):
    """
    Record sensor data of the user performing their best reps.
    The system detects individual reps, averages them into a personal
    golden rep template, and stores it for future DTW comparison.
    """
    if body.exercise not in EXERCISE_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid exercise. Must be one of: {', '.join(EXERCISE_KEYS)}",
        )

    if len(body.sensorData) < 20:
        raise HTTPException(
            status_code=400,
            detail="Not enough data for calibration. Record at least 3 reps.",
        )

    frames = [f.model_dump() for f in body.sensorData]
    result = save_user_golden_rep(body.exercise, frames, body.repsToRecord)

    return result


# ── GET /api/calibrate — List user calibrations ──────────────────────────────

@router.get("/calibrate")
async def get_calibrations():
    return {"calibrations": list_user_calibrations()}


# ── GET /api/calibrate/{exercise} — Get specific calibration ─────────────────

@router.get("/calibrate/{exercise}")
async def get_calibration(exercise: str):
    cal = load_user_golden_rep(exercise)
    if not cal:
        raise HTTPException(status_code=404, detail="No calibration found for this exercise.")
    return cal


# ── DELETE /api/calibrate/{exercise} — Remove calibration ────────────────────

@router.delete("/calibrate/{exercise}")
async def remove_calibration(exercise: str):
    ok = delete_user_golden_rep(exercise)
    if not ok:
        raise HTTPException(status_code=404, detail="No calibration found.")
    return {"message": f"Calibration for {exercise} deleted."}
