# backend/golden_rep_engine/calibration.py
# ──────────────────────────────────────────────────────────────────────────────
# User Golden Rep Calibration
#
# Allows users to record their best-form reps and create a personal golden
# rep template. The system:
#   1. Runs the standard detection pipeline to segment individual reps
#   2. Takes the best N reps (by DTW score vs. the default template)
#   3. Resamples each rep to 60 points
#   4. Averages them into a single 60x6 golden rep profile
#   5. Stores it as JSON in backend/data/calibrations/
#
# When a user calibration exists, analyze_workout can optionally use it
# instead of the built-in template.
# ──────────────────────────────────────────────────────────────────────────────

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from ..rep_detection.signal_utils import (
    extract_6d_trajectory,
    moving_average_nd,
    normalize_nd,
    resultant_magnitude,
    moving_average,
    normalize,
)
from .comparator import dtw_distance, dtw_to_accuracy
from .templates import GOLDEN_REP_TEMPLATES

logger = logging.getLogger(__name__)

CALIBRATION_DIR = Path(__file__).resolve().parent.parent / "data" / "calibrations"
TARGET_LEN = 60  # resample all reps to 60 points


def _resample_nd(signal: NDArray, target_len: int) -> NDArray:
    """Resample (N, D) to (target_len, D) via linear interpolation."""
    n, d = signal.shape
    xs_src = np.linspace(0, 1, n)
    xs_dst = np.linspace(0, 1, target_len)
    out = np.zeros((target_len, d))
    for axis in range(d):
        out[:, axis] = np.interp(xs_dst, xs_src, signal[:, axis])
    return out


def _segment_reps_from_frames(
    frames: list[dict],
    exercise_key: str,
) -> list[NDArray]:
    """
    Run the detection pipeline on raw frames and return a list of
    segmented 6-D rep trajectories (each as (M_i, 6) arrays).
    """
    from scipy.signal import find_peaks

    template = GOLDEN_REP_TEMPLATES.get(exercise_key)
    if not template or len(frames) < 20:
        return []

    raw_6d = extract_6d_trajectory(frames)
    means = np.mean(raw_6d, axis=0)
    debiased = raw_6d - means
    smoothed = moving_average_nd(debiased, 7)
    normed = normalize_nd(smoothed)

    # Peak detection on accel resultant
    accel_3d = normed[:, :3]
    resultant_raw = resultant_magnitude(accel_3d)
    resultant_smooth = moving_average(resultant_raw, 5)
    resultant_norm = normalize(resultant_smooth)

    times = np.array([f.get("time", 0) for f in frames], dtype=float)
    dur_ms = times[-1] - times[0] if len(times) > 1 else len(frames) * 20
    hz = (len(frames) / dur_ms) * 1000 if dur_ms > 0 else 50

    min_samples = max(8, int(hz * template["expected_duration_ms"][0] / 1000))
    min_dist = max(5, int(hz * 0.4))
    prom = template["peak_threshold"]

    peaks, _ = find_peaks(resultant_norm, prominence=prom, distance=min_dist)
    troughs, _ = find_peaks(-resultant_norm, prominence=prom, distance=min_dist)

    if len(peaks) + len(troughs) < 4:
        peaks, _ = find_peaks(resultant_norm, prominence=prom * 0.5, distance=min_dist)
        troughs, _ = find_peaks(-resultant_norm, prominence=prom * 0.5, distance=min_dist)

    # Merge and sort extrema
    extrema: list[tuple[str, int]] = []
    for idx in peaks:
        extrema.append(("peak", int(idx)))
    for idx in troughs:
        extrema.append(("trough", int(idx)))
    extrema.sort(key=lambda x: x[1])

    segments: list[NDArray] = []
    i = 0
    while i + 2 < len(extrema):
        t1, i1 = extrema[i]
        t2, i2 = extrema[i + 1]
        t3, i3 = extrema[i + 2]
        if t1 == t2 or t2 == t3:
            i += 1
            continue
        if i3 - i1 < min_samples:
            i += 1
            continue
        segments.append(normed[i1: i3 + 1])
        i += 2

    return segments


def save_user_golden_rep(
    exercise_key: str,
    frames: list[dict],
    reps_to_use: int = 3,
) -> dict:
    """
    Process raw sensor frames, extract reps, pick the best ones,
    average them into a personal golden rep, and save to disk.

    Returns a summary dict with the calibration result.
    """
    segments = _segment_reps_from_frames(frames, exercise_key)

    if len(segments) == 0:
        return {
            "success": False,
            "message": "Could not detect any reps in the recorded data.",
            "repsDetected": 0,
        }

    # Score each segment against the default template
    template = GOLDEN_REP_TEMPLATES[exercise_key]
    golden_6d = np.array(template["signal_6d"], dtype=float)
    golden_normed = normalize_nd(golden_6d)

    scored: list[tuple[int, float, NDArray]] = []
    for i, seg in enumerate(segments):
        seg_normed = normalize_nd(seg)
        dist = dtw_distance(seg_normed, golden_normed)
        scored.append((i, dist, seg_normed))

    # Sort by DTW distance (lower = better form)
    scored.sort(key=lambda x: x[1])

    # Take the best N reps
    best = scored[:min(reps_to_use, len(scored))]
    best_scores = [dtw_to_accuracy(s[1]) for s in best]

    # Resample each to TARGET_LEN and average
    resampled = [_resample_nd(s[2], TARGET_LEN) for s in best]
    averaged = np.mean(resampled, axis=0)  # (60, 6)

    # Per-axis normalize the averaged template
    final = normalize_nd(averaged)

    # Save to disk
    CALIBRATION_DIR.mkdir(parents=True, exist_ok=True)
    cal_data = {
        "exercise": exercise_key,
        "signal_6d": final.tolist(),
        "reps_used": len(best),
        "rep_scores": best_scores,
        "avg_score": round(sum(best_scores) / len(best_scores)),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    cal_file = CALIBRATION_DIR / f"{exercise_key}.json"
    with open(cal_file, "w") as f:
        json.dump(cal_data, f, indent=2)

    logger.info(
        "Saved calibration for %s: %d reps, avg score %d%%",
        exercise_key, len(best), cal_data["avg_score"],
    )

    return {
        "success": True,
        "message": f"Golden rep calibrated from {len(best)} best reps (avg {cal_data['avg_score']}% vs default).",
        "repsDetected": len(segments),
        "repsUsed": len(best),
        "repScores": best_scores,
        "avgScore": cal_data["avg_score"],
        "exercise": exercise_key,
    }


def load_user_golden_rep(exercise_key: str) -> dict | None:
    """Load a user's calibrated golden rep, or None if not calibrated."""
    cal_file = CALIBRATION_DIR / f"{exercise_key}.json"
    if not cal_file.exists():
        return None
    with open(cal_file, "r") as f:
        return json.load(f)


def get_golden_signal_6d(exercise_key: str) -> list[list[float]]:
    """
    Get the best available golden rep signal for an exercise:
    user calibration if it exists, otherwise the built-in default.
    """
    user_cal = load_user_golden_rep(exercise_key)
    if user_cal and "signal_6d" in user_cal:
        return user_cal["signal_6d"]
    template = GOLDEN_REP_TEMPLATES.get(exercise_key)
    if template:
        return template["signal_6d"]
    return []


def delete_user_golden_rep(exercise_key: str) -> bool:
    """Delete a user's calibration. Returns True if found and deleted."""
    cal_file = CALIBRATION_DIR / f"{exercise_key}.json"
    if cal_file.exists():
        cal_file.unlink()
        return True
    return False


def list_user_calibrations() -> list[dict]:
    """List all exercises the user has calibrated."""
    if not CALIBRATION_DIR.exists():
        return []
    result = []
    for f in CALIBRATION_DIR.glob("*.json"):
        try:
            with open(f, "r") as fh:
                data = json.load(fh)
                result.append({
                    "exercise": data.get("exercise", f.stem),
                    "repsUsed": data.get("reps_used", 0),
                    "avgScore": data.get("avg_score", 0),
                    "createdAt": data.get("created_at", ""),
                })
        except (json.JSONDecodeError, KeyError):
            continue
    return result
