# backend/golden_rep_engine/templates.py
# ──────────────────────────────────────────────────────────────────────────────
# Golden Rep Templates — 60-point normalized 6D sensor trajectories
# representing one full rep cycle for each supported exercise.
#
# Each point is a [ax, ay, az, gx, gy, gz] sextuplet in the range [-1, +1].
# Gyroscope axes capture the rotational velocity profile of each exercise,
# which is critical for detecting form issues like:
#   - Elbow flare (bench press gx deviation)
#   - Hip rotation asymmetry (squat/deadlift gz)
#   - Incomplete range of motion (gyro amplitude)
# ──────────────────────────────────────────────────────────────────────────────

import math
from typing import TypedDict


EXERCISE_KEYS = [
    "chestPress", "shoulderPress", "latPulldown", "deadlift",
    "rowing", "bicepCurls", "tricepsExtension", "squats",
]


class GoldenRepTemplate(TypedDict):
    name: str
    primary_axis: str
    signal_3d: list[list[float]]            # 60 x [ax, ay, az]  (legacy compat)
    signal_6d: list[list[float]]            # 60 x [ax, ay, az, gx, gy, gz]
    expected_duration_ms: tuple[int, int]
    peak_threshold: float
    description: str
    icon: str


def _build_6d(
    primary: list[float],
    secondary_scale: float = 0.15,
    tertiary_scale: float = 0.08,
    primary_idx: int = 1,
    gyro_profile: str = "standard",
) -> tuple[list[list[float]], list[list[float]]]:
    """
    Construct both a 60x3 and 60x6 signal from a 1-D primary profile.

    The gyroscope channels model the angular velocity that accompanies
    the linear acceleration of each exercise phase:
      - gx: rotation around the lateral axis (sagittal plane motion)
      - gy: rotation around the vertical axis (transverse plane)
      - gz: rotation around the anterior axis (frontal plane)

    Returns (signal_3d, signal_6d).
    """
    n = len(primary)
    signal_3d: list[list[float]] = []
    signal_6d: list[list[float]] = []

    # Gyro profile parameters per exercise type
    gyro_params = {
        "standard":   {"gx_scale": 0.60, "gy_scale": 0.25, "gz_scale": 0.15,
                        "gx_phase": 0.3, "gy_phase": 1.0, "gz_phase": 0.5},
        "press":      {"gx_scale": 0.50, "gy_scale": 0.10, "gz_scale": 0.20,
                        "gx_phase": 0.4, "gy_phase": 1.2, "gz_phase": 0.8},
        "pull":       {"gx_scale": 0.55, "gy_scale": 0.30, "gz_scale": 0.15,
                        "gx_phase": 0.2, "gy_phase": 0.8, "gz_phase": 0.4},
        "hinge":      {"gx_scale": 0.70, "gy_scale": 0.15, "gz_scale": 0.25,
                        "gx_phase": 0.1, "gy_phase": 1.5, "gz_phase": 0.6},
        "curl":       {"gx_scale": 0.80, "gy_scale": 0.10, "gz_scale": 0.10,
                        "gx_phase": 0.2, "gy_phase": 0.5, "gz_phase": 0.3},
        "row":        {"gx_scale": 0.40, "gy_scale": 0.35, "gz_scale": 0.30,
                        "gx_phase": 0.3, "gy_phase": 0.7, "gz_phase": 0.9},
    }
    gp = gyro_params.get(gyro_profile, gyro_params["standard"])

    for i in range(n):
        t = i / max(n - 1, 1)
        p = primary[i]

        # Accelerometer secondary/tertiary axes
        sec = secondary_scale * math.sin(2 * math.pi * t * 2.0 + 0.5) * (0.3 + abs(p))
        ter = tertiary_scale * math.cos(2 * math.pi * t * 1.5) * (0.2 + abs(p) * 0.5)

        point_3d = [0.0, 0.0, 0.0]
        point_3d[primary_idx] = p
        point_3d[(primary_idx + 1) % 3] = round(sec, 4)
        point_3d[(primary_idx + 2) % 3] = round(ter, 4)

        # Gyroscope: derivative-coupled angular velocity
        # gx is primarily driven by the rate of change of the primary axis
        dp = 0.0
        if 0 < i < n - 1:
            dp = (primary[i + 1] - primary[i - 1]) / 2.0
        elif i == 0 and n > 1:
            dp = primary[1] - primary[0]
        elif i == n - 1 and n > 1:
            dp = primary[-1] - primary[-2]

        gx = gp["gx_scale"] * dp * 5.0 + gp["gx_scale"] * 0.2 * math.sin(
            2 * math.pi * t * 1.5 + gp["gx_phase"]
        )
        gy = gp["gy_scale"] * math.sin(
            2 * math.pi * t * 2.0 + gp["gy_phase"]
        ) * (0.3 + abs(p))
        gz = gp["gz_scale"] * math.cos(
            2 * math.pi * t * 1.0 + gp["gz_phase"]
        ) * (0.2 + abs(dp) * 2.0)

        point_6d = [
            point_3d[0], point_3d[1], point_3d[2],
            round(gx, 4), round(gy, 4), round(gz, 4),
        ]

        signal_3d.append(point_3d)
        signal_6d.append(point_6d)

    return signal_3d, signal_6d


# ── Raw 1-D profiles ────────────────────────────────────────────────────────

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


# ── Build templates ──────────────────────────────────────────────────────────

def _make_template(
    name: str,
    primary_axis: str,
    primary_1d: list[float],
    secondary_scale: float,
    tertiary_scale: float,
    primary_idx: int,
    gyro_profile: str,
    expected_duration_ms: tuple[int, int],
    peak_threshold: float,
    description: str,
    icon: str,
) -> GoldenRepTemplate:
    s3d, s6d = _build_6d(
        primary_1d, secondary_scale, tertiary_scale, primary_idx, gyro_profile,
    )
    return {
        "name": name,
        "primary_axis": primary_axis,
        "signal_3d": s3d,
        "signal_6d": s6d,
        "expected_duration_ms": expected_duration_ms,
        "peak_threshold": peak_threshold,
        "description": description,
        "icon": icon,
    }


GOLDEN_REP_TEMPLATES: dict[str, GoldenRepTemplate] = {

    "squats": _make_template(
        "Squats", "ay", _SQUAT_1D, 0.18, 0.10, 1, "standard",
        (2000, 5000), 0.35,
        "Lower body compound — bar on traps. Phone in front pocket.", "🦵",
    ),

    "deadlift": _make_template(
        "Deadlift", "ay", _DEADLIFT_1D, 0.20, 0.12, 1, "hinge",
        (2500, 6000), 0.40,
        "Hip hinge posterior chain. Phone clipped to waistband/belt.", "🔱",
    ),

    "chestPress": _make_template(
        "Chest Press", "ay", _CHEST_PRESS_1D, 0.15, 0.08, 1, "press",
        (1500, 4000), 0.30,
        "Horizontal push — pectorals. Phone flat on chest/sternum.", "🏋️",
    ),

    "shoulderPress": _make_template(
        "Shoulder Press", "ay", _SHOULDER_PRESS_1D, 0.16, 0.09, 1, "press",
        (1500, 4000), 0.35,
        "Overhead vertical press — deltoids. Phone in chest pocket.", "💪",
    ),

    "latPulldown": _make_template(
        "Lat Pulldown", "ay", _LAT_PULLDOWN_1D, 0.14, 0.08, 1, "pull",
        (1500, 4000), 0.30,
        "Vertical pull — latissimus dorsi. Phone in waistband.", "⬇️",
    ),

    "rowing": _make_template(
        "Rowing", "az", _ROWING_1D, 0.22, 0.12, 2, "row",
        (1500, 4000), 0.30,
        "Horizontal pull — rhomboids/mid-back. Phone held in hand.", "🚣",
    ),

    "bicepCurls": _make_template(
        "Bicep Curls", "ay", _BICEP_CURLS_1D, 0.12, 0.06, 1, "curl",
        (2000, 4000), 0.30,
        "Elbow flexion — biceps brachii. Phone held in hand.", "💪",
    ),

    "tricepsExtension": _make_template(
        "Triceps Extension", "ay", _TRICEPS_EXT_1D, 0.14, 0.07, 1, "curl",
        (2000, 4000), 0.30,
        "Elbow extension — triceps brachii. Phone in hand.", "🦾",
    ),
}


# Quick lookup list for the UI
EXERCISE_LIST = [
    {"key": k, "label": v["name"], "icon": v["icon"], "description": v["description"]}
    for k, v in GOLDEN_REP_TEMPLATES.items()
]
