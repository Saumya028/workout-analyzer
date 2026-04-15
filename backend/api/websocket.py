# backend/api/websocket.py
# ──────────────────────────────────────────────────────────────────────────────
# WebSocket endpoint for real-time sensor data streaming with live rep feedback.
#
# Protocol:
#   Client -> { "action": "start", "exercise": "squats" }
#   Client -> { "action": "frame", "data": { ...SensorFrame } }  (streamed)
#   Server <- { "type": "rep_detected", repNumber, score, totalReps, avgAccuracy }
#   Client -> { "action": "stop" }
#   Server <- { "type": "result", reps, accuracy, repScores, ... }
# ──────────────────────────────────────────────────────────────────────────────

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..rep_detection.detector import analyze_workout
from ..golden_rep_engine.templates import EXERCISE_KEYS

logger = logging.getLogger(__name__)

ws_router = APIRouter()

# How often (in frames) to run incremental analysis during recording
_ANALYSIS_INTERVAL = 30


@ws_router.websocket("/ws/workout")
async def workout_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    exercise = "squats"
    frames: list[dict] = []
    recording = False
    last_rep_count = 0
    last_rep_scores: list[int] = []

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            action = msg.get("action", "")

            if action == "start":
                exercise = msg.get("exercise", "squats")
                if exercise not in EXERCISE_KEYS:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Invalid exercise: {exercise}",
                    })
                    continue

                frames = []
                recording = True
                last_rep_count = 0
                last_rep_scores = []
                await websocket.send_json({
                    "type": "started",
                    "exercise": exercise,
                    "message": f"Recording started for {exercise}",
                })

            elif action == "frame" and recording:
                data = msg.get("data", {})
                frames.append(data)

                # ── Incremental analysis for real-time rep feedback ───────
                if len(frames) >= 40 and len(frames) % _ANALYSIS_INTERVAL == 0:
                    try:
                        live = analyze_workout(frames, exercise)
                        new_reps = live["reps"]
                        new_scores = live["rep_scores"]

                        # Detect newly completed reps
                        if new_reps > last_rep_count and len(new_scores) > len(last_rep_scores):
                            for i in range(len(last_rep_scores), len(new_scores)):
                                avg = (
                                    round(sum(new_scores[: i + 1]) / (i + 1))
                                    if new_scores[: i + 1]
                                    else 0
                                )
                                await websocket.send_json({
                                    "type": "rep_detected",
                                    "repNumber": i + 1,
                                    "score": new_scores[i],
                                    "totalReps": new_reps,
                                    "avgAccuracy": avg,
                                })

                            last_rep_count = new_reps
                            last_rep_scores = list(new_scores)

                        # Periodic progress update
                        await websocket.send_json({
                            "type": "progress",
                            "frameCount": len(frames),
                            "liveReps": new_reps,
                            "liveAccuracy": live["accuracy"],
                        })
                    except Exception as e:
                        logger.warning("Incremental analysis failed: %s", e)
                        await websocket.send_json({
                            "type": "progress",
                            "frameCount": len(frames),
                        })

                # Lightweight progress every 50 frames when not analysing
                elif len(frames) % 50 == 0:
                    await websocket.send_json({
                        "type": "progress",
                        "frameCount": len(frames),
                    })

            elif action == "stop":
                recording = False

                if len(frames) < 10:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Not enough frames for analysis (min 10).",
                    })
                    continue

                # Final analysis
                analysis = analyze_workout(frames, exercise)
                await websocket.send_json({
                    "type": "result",
                    "reps": analysis["reps"],
                    "accuracy": analysis["accuracy"],
                    "repScores": analysis["rep_scores"],
                    "detectedSegments": analysis["detected_segments"],
                    "goldenSignal": analysis["golden_signal"],
                    "userSignals": analysis["user_signals"],
                    "frameCount": len(frames),
                })
                frames = []
                last_rep_count = 0
                last_rep_scores = []

            elif action == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
