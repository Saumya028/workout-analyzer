# backend/golden_rep_engine/templates.py
# ──────────────────────────────────────────────────────────────────────────────
# Golden Rep Templates — 60-point normalized accelerometer trajectories
# representing one full rep cycle for each supported exercise.
#
# These are used as DTW reference sequences for accuracy scoring.
# Positive = upward/concentric force, Negative = downward/eccentric.
# ──────────────────────────────────────────────────────────────────────────────

from typing import TypedDict

EXERCISE_KEYS = [
    "chestPress", "shoulderPress", "latPulldown", "deadlift",
    "rowing", "bicepCurls", "tricepsExtension", "squats",
]


class GoldenRepTemplate(TypedDict):
    name: str
    primary_axis: str          # "ax" | "ay" | "az"
    signal: list[float]        # 60-point normalised profile −1 to +1
    expected_duration_ms: tuple[int, int]
    peak_threshold: float
    description: str
    icon: str


GOLDEN_REP_TEMPLATES: dict[str, GoldenRepTemplate] = {

    # ── SQUATS ────────────────────────────────────────────────────────────────
    "squats": {
        "name": "Squats",
        "primary_axis": "ay",
        "signal": [
            0.00, 0.02, 0.01, -0.05, -0.12, -0.22, -0.38, -0.55,
            -0.70, -0.82, -0.90, -0.96, -1.00, -0.98, -0.92, -0.82,
            -0.68, -0.50, -0.30, -0.10, 0.05, 0.18, 0.35, 0.55,
            0.72, 0.88, 0.98, 1.00, 0.96, 0.88, 0.76, 0.62,
            0.48, 0.34, 0.22, 0.12, 0.06, 0.02, 0.00, -0.02,
            -0.04, -0.03, -0.01, 0.01, 0.02, 0.01, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00,
        ],
        "expected_duration_ms": (2000, 5000),
        "peak_threshold": 0.35,
        "description": "Lower body compound — bar on traps. Phone in front pocket.",
        "icon": "🦵",
    },

    # ── DEADLIFT ──────────────────────────────────────────────────────────────
    "deadlift": {
        "name": "Deadlift",
        "primary_axis": "ay",
        "signal": [
            0.00, 0.02, 0.05, 0.08, 0.10, 0.12, 0.10, 0.06,
            0.00, -0.08, -0.18, -0.30, -0.42, -0.52, -0.58, -0.60,
            -0.58, -0.50, -0.38, -0.22, -0.05, 0.15, 0.35, 0.55,
            0.72, 0.87, 0.96, 1.00, 0.98, 0.92, 0.84, 0.74,
            0.64, 0.55, 0.46, 0.38, 0.30, 0.22, 0.15, 0.10,
            0.06, 0.03, 0.01, -0.02, -0.05, -0.08, -0.10, -0.10,
            -0.08, -0.05, -0.02, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00,
        ],
        "expected_duration_ms": (2500, 6000),
        "peak_threshold": 0.40,
        "description": "Hip hinge posterior chain. Phone clipped to waistband/belt.",
        "icon": "🔱",
    },

    # ── CHEST PRESS ───────────────────────────────────────────────────────────
    "chestPress": {
        "name": "Chest Press",
        "primary_axis": "ay",
        "signal": [
            0.00, 0.02, 0.04, 0.06, 0.05, 0.02, -0.02, -0.08,
            -0.16, -0.26, -0.38, -0.50, -0.62, -0.72, -0.80, -0.86,
            -0.90, -0.88, -0.82, -0.72, -0.58, -0.40, -0.20, -0.02,
            0.16, 0.34, 0.52, 0.68, 0.82, 0.92, 0.98, 1.00,
            0.98, 0.92, 0.84, 0.74, 0.62, 0.50, 0.38, 0.26,
            0.16, 0.08, 0.03, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00,
        ],
        "expected_duration_ms": (1500, 4000),
        "peak_threshold": 0.30,
        "description": "Horizontal push — pectorals. Phone flat on chest/sternum.",
        "icon": "🏋️",
    },

    # ── SHOULDER PRESS ────────────────────────────────────────────────────────
    "shoulderPress": {
        "name": "Shoulder Press",
        "primary_axis": "ay",
        "signal": [
            0.00, 0.02, 0.05, 0.08, 0.06, 0.02, -0.04, -0.12,
            -0.22, -0.34, -0.48, -0.62, -0.74, -0.84, -0.92, -0.96,
            -0.98, -0.96, -0.90, -0.78, -0.62, -0.44, -0.24, -0.04,
            0.18, 0.40, 0.60, 0.78, 0.90, 0.97, 1.00, 1.00,
            0.98, 0.93, 0.85, 0.75, 0.62, 0.48, 0.34, 0.21,
            0.12, 0.05, 0.01, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00,
        ],
        "expected_duration_ms": (1500, 4000),
        "peak_threshold": 0.35,
        "description": "Overhead vertical press — deltoids. Phone in chest pocket.",
        "icon": "💪",
    },

    # ── LAT PULLDOWN ──────────────────────────────────────────────────────────
    "latPulldown": {
        "name": "Lat Pulldown",
        "primary_axis": "ay",
        "signal": [
            0.00, 0.02, 0.06, 0.12, 0.20, 0.28, 0.34, 0.38,
            0.40, 0.38, 0.32, 0.24, 0.14, 0.02, -0.12, -0.28,
            -0.44, -0.60, -0.74, -0.86, -0.94, -1.00, -1.00, -0.96,
            -0.88, -0.76, -0.62, -0.46, -0.30, -0.14, -0.02, 0.06,
            0.14, 0.20, 0.24, 0.26, 0.24, 0.20, 0.14, 0.08,
            0.04, 0.01, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00,
        ],
        "expected_duration_ms": (1500, 4000),
        "peak_threshold": 0.30,
        "description": "Vertical pull — latissimus dorsi. Phone in waistband.",
        "icon": "⬇️",
    },

    # ── ROWING ────────────────────────────────────────────────────────────────
    "rowing": {
        "name": "Rowing",
        "primary_axis": "az",
        "signal": [
            0.00, 0.00, -0.02, -0.06, -0.14, -0.24, -0.36, -0.48,
            -0.60, -0.70, -0.78, -0.82, -0.84, -0.80, -0.72, -0.60,
            -0.44, -0.26, -0.06, 0.14, 0.32, 0.50, 0.66, 0.80,
            0.90, 0.97, 1.00, 1.00, 0.98, 0.92, 0.84, 0.74,
            0.62, 0.50, 0.36, 0.22, 0.10, 0.02, -0.04, -0.06,
            -0.04, -0.02, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00,
        ],
        "expected_duration_ms": (1500, 4000),
        "peak_threshold": 0.30,
        "description": "Horizontal pull — rhomboids/mid-back. Phone held in hand.",
        "icon": "🚣",
    },

    # ── BICEP CURLS ───────────────────────────────────────────────────────────
    "bicepCurls": {
        "name": "Bicep Curls",
        "primary_axis": "ay",
        "signal": [
            0.00, 0.02, 0.06, 0.12, 0.22, 0.36, 0.52, 0.68,
            0.82, 0.92, 0.98, 1.00, 0.98, 0.92, 0.84, 0.76,
            0.66, 0.56, 0.44, 0.32, 0.20, 0.10, 0.02, -0.04,
            -0.10, -0.14, -0.16, -0.16, -0.14, -0.10, -0.06, -0.02,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00,
        ],
        "expected_duration_ms": (1200, 3500),
        "peak_threshold": 0.30,
        "description": "Elbow flexion — biceps brachii. Phone held in hand.",
        "icon": "💪",
    },

    # ── TRICEPS EXTENSION ─────────────────────────────────────────────────────
    "tricepsExtension": {
        "name": "Triceps Extension",
        "primary_axis": "ay",
        "signal": [
            0.00, -0.02, -0.06, -0.14, -0.24, -0.38, -0.52, -0.66,
            -0.78, -0.88, -0.95, -1.00, -0.98, -0.92, -0.80, -0.64,
            -0.44, -0.22, -0.02, 0.18, 0.38, 0.56, 0.72, 0.84,
            0.93, 0.98, 1.00, 0.98, 0.92, 0.82, 0.68, 0.52,
            0.36, 0.20, 0.08, 0.02, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
            0.00, 0.00, 0.00, 0.00,
        ],
        "expected_duration_ms": (1200, 3500),
        "peak_threshold": 0.30,
        "description": "Elbow extension — triceps brachii. Phone in hand.",
        "icon": "🦾",
    },
}


# Quick lookup list for the UI
EXERCISE_LIST = [
    {"key": k, "label": v["name"], "icon": v["icon"], "description": v["description"]}
    for k, v in GOLDEN_REP_TEMPLATES.items()
]
