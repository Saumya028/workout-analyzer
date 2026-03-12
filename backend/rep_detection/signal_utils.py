# backend/rep_detection/signal_utils.py
# ──────────────────────────────────────────────────────────────────────────────
# Signal processing utilities for sensor data — supports both 1-D and 3-D.
# ──────────────────────────────────────────────────────────────────────────────

import math
import random
import numpy as np
from numpy.typing import NDArray


# ── 1-D utilities (retained for backward compat / peak detection) ─────────────

def moving_average(signal: NDArray, window: int = 7) -> NDArray:
    """Apply a centred moving-average smooth to a 1-D signal."""
    if len(signal) == 0:
        return signal
    kernel = np.ones(window) / window
    padded = np.pad(signal, (window // 2, window // 2), mode="edge")
    return np.convolve(padded, kernel, mode="valid")[: len(signal)]


def normalize(signal: NDArray) -> NDArray:
    """Normalise a 1-D signal to [-1, +1] range."""
    if len(signal) == 0:
        return signal
    max_abs = np.max(np.abs(signal))
    if max_abs == 0:
        return np.zeros_like(signal)
    return signal / max_abs


def extract_axis(frames: list[dict], axis: str) -> NDArray:
    """Extract a single axis (e.g. 'ay') from a list of sensor frames."""
    return np.array([f.get(axis, 0.0) for f in frames], dtype=float)


# ── 3-D utilities ────────────────────────────────────────────────────────────

def extract_3d_trajectory(frames: list[dict]) -> NDArray:
    """
    Extract the full 3-axis accelerometer trajectory from sensor frames.

    Returns
    -------
    NDArray of shape (N, 3)  — columns are [ax, ay, az].
    """
    return np.array(
        [[f.get("ax", 0.0), f.get("ay", 0.0), f.get("az", 0.0)] for f in frames],
        dtype=float,
    )


def moving_average_3d(trajectory: NDArray, window: int = 7) -> NDArray:
    """
    Apply a centred moving-average smooth to each axis of a (N, 3) trajectory
    independently.  Returns an (N, 3) array.
    """
    if len(trajectory) == 0:
        return trajectory
    out = np.empty_like(trajectory)
    for axis in range(trajectory.shape[1]):
        out[:, axis] = moving_average(trajectory[:, axis], window)
    return out


def normalize_3d(trajectory: NDArray) -> NDArray:
    """
    Per-axis magnitude normalisation for a (N, 3) trajectory.
    Each axis is independently scaled to [−1, +1].
    """
    if len(trajectory) == 0:
        return trajectory
    out = np.empty_like(trajectory)
    for axis in range(trajectory.shape[1]):
        col = trajectory[:, axis]
        max_abs = np.max(np.abs(col))
        out[:, axis] = col / max_abs if max_abs > 0 else np.zeros_like(col)
    return out


def resultant_magnitude(trajectory: NDArray) -> NDArray:
    """
    Compute the resultant acceleration magnitude for each sample:
        r[i] = √(ax² + ay² + az²)

    This 1-D signal is useful for peak detection because it captures the
    total movement energy regardless of direction.

    Returns a 1-D array of shape (N,).
    """
    return np.linalg.norm(trajectory, axis=1)


# ── Test-data generator ──────────────────────────────────────────────────────

def generate_test_data(exercise_key: str, num_reps: int = 5) -> list[dict]:
    """
    Generate synthetic sensor data mimicking a given exercise.
    Returns a list of dicts matching SensorFrame format.
    """
    params = {
        "squats":           {"ay_amp": 3.0, "az_amp": 0.4, "g_amp": 30, "freq": 0.42},
        "chestPress":       {"ay_amp": 2.2, "az_amp": 0.3, "g_amp": 20, "freq": 0.42},
        "shoulderPress":    {"ay_amp": 2.5, "az_amp": 0.3, "g_amp": 25, "freq": 0.42},
        "latPulldown":      {"ay_amp": -2.0, "az_amp": 0.4, "g_amp": 18, "freq": 0.42},
        "deadlift":         {"ay_amp": 2.8, "az_amp": 0.5, "g_amp": 22, "freq": 0.33},
        "rowing":           {"ay_amp": 1.5, "az_amp": 2.0, "g_amp": 20, "freq": 0.42},
        "bicepCurls":       {"ay_amp": 2.0, "az_amp": 0.3, "g_amp": 35, "freq": 0.50},
        "tricepsExtension": {"ay_amp": -1.8, "az_amp": 0.3, "g_amp": 30, "freq": 0.50},
    }
    p = params.get(exercise_key, {"ay_amp": 2.0, "az_amp": 0.3, "g_amp": 20, "freq": 0.42})

    sample_rate = 50
    rep_duration = 2.4
    total = int(sample_rate * rep_duration * num_reps)
    t0 = 1700000000000  # base timestamp

    frames = []
    for i in range(total):
        t = i / sample_rate
        theta = 2 * math.pi * p["freq"] * t
        noise = lambda: (random.random() - 0.5) * 0.1

        frames.append({
            "time": t0 + int(i * (1000 / sample_rate)),
            "ax": 0.2 * math.sin(theta * 2) + noise(),
            "ay": p["ay_amp"] * math.sin(theta) + p["ay_amp"] * 0.25 * math.sin(theta * 2) + noise(),
            "az": p["az_amp"] * math.cos(theta) + noise(),
            "gx": p["g_amp"] * math.sin(theta + 0.3) + noise() * 5,
            "gy": p["g_amp"] * 0.6 * math.cos(theta) + noise() * 5,
            "gz": p["g_amp"] * 0.3 * math.sin(theta * 2) + noise() * 3,
        })

    return frames
