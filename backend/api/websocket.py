# backend/api/websocket.py
# ──────────────────────────────────────────────────────────────────────────────
# WebSocket endpoint for real-time sensor data streaming.
# Clients connect, send sensor frames, and receive live rep detection results.
# ──────────────────────────────────────────────────────────────────────────────

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..rep_detection.detector import analyze_workout
from ..golden_rep_engine.templates import EXERCISE_KEYS

ws_router = APIRouter()


@ws_router.websocket("/ws/workout")
async def workout_websocket(websocket: WebSocket):
    """
    WebSocket protocol:
    ───────────────────
    1. Client sends JSON: { "action": "start", "exercise": "squats" }
    2. Client streams frames: { "action": "frame", "data": { ...SensorFrame } }
    3. Client sends: { "action": "stop" }
    4. Server responds with analysis results.

    Server may also send intermediate updates (frame count, live stats).
    """
    await websocket.accept()
    exercise = "squats"
    frames: list[dict] = []
    recording = False

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
                await websocket.send_json({
                    "type": "started",
                    "exercise": exercise,
                    "message": f"Recording started for {exercise}",
                })

            elif action == "frame" and recording:
                data = msg.get("data", {})
                frames.append(data)

                # Send periodic updates every 50 frames
                if len(frames) % 50 == 0:
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

                # Run analysis
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

            elif action == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
