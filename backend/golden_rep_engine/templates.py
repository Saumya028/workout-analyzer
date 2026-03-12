# backend/golden_rep_engine/templates.py
# ──────────────────────────────────────────────────────────────────────────────
# Golden Rep Templates — 60-point normalized 3D accelerometer trajectories
# representing one full rep cycle for each supported exercise.
#
# Each point is a [ax, ay, az] triplet in the range [−1, +1].
# The primary_axis field is retained for peak detection (resultant fallback).
# ──────────────────────────────────────────────────────────────────────────────

from typing import TypedDict


EXERCISE_KEYS = [
    "chestPress", "shoulderPress", "latPulldown", "deadlift",
    "rowing", "bicepCurls", "tricepsExtension", "squats",
]


class GoldenRepTemplate(TypedDict):
    name: str
    primary_axis: str                       # hint for peak detection fallback
    signal_3d: list[list[float]]            # 60 × [ax, ay, az] normalised
    expected_duration_ms: tuple[int, int]
    peak_threshold: float
    description: str
    icon: str


def _build_3d(
    primary: list[float],
    secondary_scale: float = 0.15,
    tertiary_scale: float = 0.08,
    primary_idx: int = 1,
) -> list[list[float]]:
    """
    Helper to construct a 60×3 signal from a 1-D primary profile.
    Generates biomechanically plausible secondary/tertiary axes from the
    primary signal using phase-shifted sinusoidal coupling.

    Parameters
    ----------
    primary : 60-point primary axis profile (−1 to +1)
    secondary_scale : amplitude of the secondary axis relative to primary
    tertiary_scale  : amplitude of the tertiary axis relative to primary
    primary_idx     : which column is the primary axis (0=ax, 1=ay, 2=az)
    """
    import math
    n = len(primary)
    out: list[list[float]] = []

    for i in range(n):
        t = i / max(n - 1, 1)
        p = primary[i]

        # Secondary: phase-shifted derivative-like coupling
        sec = secondary_scale * math.sin(2 * math.pi * t * 2.0 + 0.5) * (0.3 + abs(p))
        # Tertiary:  slower complementary movement
        ter = tertiary_scale * math.cos(2 * math.pi * t * 1.5) * (0.2 + abs(p) * 0.5)

        point = [0.0, 0.0, 0.0]
        point[primary_idx] = p
        point[(primary_idx + 1) % 3] = round(sec, 4)
        point[(primary_idx + 2) % 3] = round(ter, 4)
        out.append(point)

    return out


# ── Raw 1-D profiles (same as v1) ────────────────────────────────────────────

_SQUAT_1D = [
    0.00, 0.02, 0.01, -0.05, -0.12, -0.22, -0.38, -0.55,
    -0.70, -0.82, -0.90, -0.96, -1.00, -0.98, -0.92, -0.82,
    -0.68, -0.50, -0.30, -0.10, 0.05, 0.18, 0.35, 0.55,
    0.72, 0.88, 0.98, 1.00, 0.96, 0.88, 0.76, 0.62,
    0.48, 0.34, 0.22, 0.12, 0.06, 0.02, 0.00, -0.02,
    -0.04, -0.03, -0.01, 0.01, 0.02, 0.01, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00,
]

_DEADLIFT_1D = [
    0.00, 0.02, 0.05, 0.08, 0.10, 0.12, 0.10, 0.06,
    0.00, -0.08, -0.18, -0.30, -0.42, -0.52, -0.58, -0.60,
    -0.58, -0.50, -0.38, -0.22, -0.05, 0.15, 0.35, 0.55,
    0.72, 0.87, 0.96, 1.00, 0.98, 0.92, 0.84, 0.74,
    0.64, 0.55, 0.46, 0.38, 0.30, 0.22, 0.15, 0.10,
    0.06, 0.03, 0.01, -0.02, -0.05, -0.08, -0.10, -0.10,
    -0.08, -0.05, -0.02, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00,
]

_CHEST_PRESS_1D = [
    0.00, 0.02, 0.04, 0.06, 0.05, 0.02, -0.02, -0.08,
    -0.16, -0.26, -0.38, -0.50, -0.62, -0.72, -0.80, -0.86,
    -0.90, -0.88, -0.82, -0.72, -0.58, -0.40, -0.20, -0.02,
    0.16, 0.34, 0.52, 0.68, 0.82, 0.92, 0.98, 1.00,
    0.98, 0.92, 0.84, 0.74, 0.62, 0.50, 0.38, 0.26,
    0.16, 0.08, 0.03, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00,
]

_SHOULDER_PRESS_1D = [
    0.00, 0.02, 0.05, 0.08, 0.06, 0.02, -0.04, -0.12,
    -0.22, -0.34, -0.48, -0.62, -0.74, -0.84, -0.92, -0.96,
    -0.98, -0.96, -0.90, -0.78, -0.62, -0.44, -0.24, -0.04,
    0.18, 0.40, 0.60, 0.78, 0.90, 0.97, 1.00, 1.00,
    0.98, 0.93, 0.85, 0.75, 0.62, 0.48, 0.34, 0.21,
    0.12, 0.05, 0.01, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00,
]

_LAT_PULLDOWN_1D = [
    0.00, 0.02, 0.06, 0.12, 0.20, 0.28, 0.34, 0.38,
    0.40, 0.38, 0.32, 0.24, 0.14, 0.02, -0.12, -0.28,
    -0.44, -0.60, -0.74, -0.86, -0.94, -1.00, -1.00, -0.96,
    -0.88, -0.76, -0.62, -0.46, -0.30, -0.14, -0.02, 0.06,
    0.14, 0.20, 0.24, 0.26, 0.24, 0.20, 0.14, 0.08,
    0.04, 0.01, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00,
]

_ROWING_1D = [
    0.00, 0.00, -0.02, -0.06, -0.14, -0.24, -0.36, -0.48,
    -0.60, -0.70, -0.78, -0.82, -0.84, -0.80, -0.72, -0.60,
    -0.44, -0.26, -0.06, 0.14, 0.32, 0.50, 0.66, 0.80,
    0.90, 0.97, 1.00, 1.00, 0.98, 0.92, 0.84, 0.74,
    0.62, 0.50, 0.36, 0.22, 0.10, 0.02, -0.04, -0.06,
    -0.04, -0.02, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00,
]

_BICEP_CURLS_1D = [
    0.00, 0.02, 0.06, 0.12, 0.22, 0.36, 0.52, 0.68,
    0.82, 0.92, 0.98, 1.00, 0.98, 0.92, 0.84, 0.76,
    0.66, 0.56, 0.44, 0.32, 0.20, 0.10, 0.02, -0.04,
    -0.10, -0.14, -0.16, -0.16, -0.14, -0.10, -0.06, -0.02,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00,
]

_TRICEPS_EXT_1D = [
    0.00, -0.02, -0.06, -0.14, -0.24, -0.38, -0.52, -0.66,
    -0.78, -0.88, -0.95, -1.00, -0.98, -0.92, -0.80, -0.64,
    -0.44, -0.22, -0.02, 0.18, 0.38, 0.56, 0.72, 0.84,
    0.93, 0.98, 1.00, 0.98, 0.92, 0.82, 0.68, 0.52,
    0.36, 0.20, 0.08, 0.02, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
    0.00, 0.00, 0.00, 0.00,
]


# ── Build 3-D templates ──────────────────────────────────────────────────────

GOLDEN_REP_TEMPLATES: dict[str, GoldenRepTemplate] = {

    "squats": {
        "name": "Squats",
        "primary_axis": "ay",
        "signal_3d": _build_3d(_SQUAT_1D, secondary_scale=0.18, tertiary_scale=0.10, primary_idx=1),
        "expected_duration_ms": (2000, 5000),
        "peak_threshold": 0.35,
        "description": "Lower body compound — bar on traps. Phone in front pocket.",
        "icon": "🦵",
    },

    "deadlift": {
        "name": "Deadlift",
        "primary_axis": "ay",
        "signal_3d": _build_3d(_DEADLIFT_1D, secondary_scale=0.20, tertiary_scale=0.12, primary_idx=1),
        "expected_duration_ms": (2500, 6000),
        "peak_threshold": 0.40,
        "description": "Hip hinge posterior chain. Phone clipped to waistband/belt.",
        "icon": "🔱",
    },

    "chestPress": {
        "name": "Chest Press",
        "primary_axis": "ay",
        "signal_3d": _build_3d(_CHEST_PRESS_1D, secondary_scale=0.15, tertiary_scale=0.08, primary_idx=1),
        "expected_duration_ms": (1500, 4000),
        "peak_threshold": 0.30,
        "description": "Horizontal push — pectorals. Phone flat on chest/sternum.",
        "icon": "🏋️",
    },

    "shoulderPress": {
        "name": "Shoulder Press",
        "primary_axis": "ay",
        "signal_3d": _build_3d(_SHOULDER_PRESS_1D, secondary_scale=0.16, tertiary_scale=0.09, primary_idx=1),
        "expected_duration_ms": (1500, 4000),
        "peak_threshold": 0.35,
        "description": "Overhead vertical press — deltoids. Phone in chest pocket.",
        "icon": "💪",
    },

    "latPulldown": {
        "name": "Lat Pulldown",
        "primary_axis": "ay",
        "signal_3d": _build_3d(_LAT_PULLDOWN_1D, secondary_scale=0.14, tertiary_scale=0.08, primary_idx=1),
        "expected_duration_ms": (1500, 4000),
        "peak_threshold": 0.30,
        "description": "Vertical pull — latissimus dorsi. Phone in waistband.",
        "icon": "⬇️",
    },

    "rowing": {
        "name": "Rowing",
        "primary_axis": "az",
        # Rowing primary axis is az (idx=2), with larger ax coupling
        "signal_3d": _build_3d(_ROWING_1D, secondary_scale=0.22, tertiary_scale=0.12, primary_idx=2),
        "expected_duration_ms": (1500, 4000),
        "peak_threshold": 0.30,
        "description": "Horizontal pull — rhomboids/mid-back. Phone held in hand.",
        "icon": "🚣",
    },

    "bicepCurls": {
        "name": "Bicep Curls",
        "primary_axis": "ay",
        "signal_3d": _build_3d(_BICEP_CURLS_1D, secondary_scale=0.12, tertiary_scale=0.06, primary_idx=1),
        "expected_duration_ms": (1200, 3500),
        "peak_threshold": 0.30,
        "description": "Elbow flexion — biceps brachii. Phone held in hand.",
        "icon": "💪",
    },

    "tricepsExtension": {
        "name": "Triceps Extension",
        "primary_axis": "ay",
        "signal_3d": _build_3d(_TRICEPS_EXT_1D, secondary_scale=0.14, tertiary_scale=0.07, primary_idx=1),
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
