# backend/rep_detection/detector.py
# ──────────────────────────────────────────────────────────────────────────────
# 3-D Rep Detection Pipeline
#   1. Extract full (ax, ay, az) trajectory from sensor frames
#   2. Remove gravity bias (subtract per-axis mean)
#   3. Smooth each axis with moving average
#   4. Per-axis normalise to [−1, +1]
#   5. Compute resultant magnitude for peak/trough detection (1-D)
#   6. Detect peaks/troughs with scipy.signal.find_peaks on resultant
#   7. Segment the *3-D trajectory* using peak/trough indices
#   8. Score each 3-D segment against the golden template via 3-D DTW
# ──────────────────────────────────────────────────────────────────────────────

import numpy as np
from scipy.signal import find_peaks

from .signal_utils import (
    extract_3d_trajectory,
    moving_average_3d,
    normalize_3d,
    resultant_magnitude,
    moving_average,
    normalize,
)
from ..golden_rep_engine.templates import GOLDEN_REP_TEMPLATES
from ..golden_rep_engine.comparator import dtw_distance, dtw_to_accuracy


def _segment_reps_3d(
    trajectory_3d: np.ndarray,
    resultant_1d: np.ndarray,
    peak_indices: np.ndarray,
    trough_indices: np.ndarray,
    min_samples: int,
) -> list[np.ndarray]:
    """
    Segment a 3-D trajectory (N, 3) into full rep cycles using alternating
    peak/trough pairs detected on the 1-D resultant magnitude.

    A full rep = peak → trough → peak  (or trough → peak → trough).

    Returns a list of (M_i, 3) sub-arrays — one per detected rep.
    """
    # Merge peaks and troughs into an ordered list of extrema
    extrema: list[tuple[str, int]] = []
    for idx in peak_indices:
        extrema.append(("peak", int(idx)))
    for idx in trough_indices:
        extrema.append(("trough", int(idx)))
    extrema.sort(key=lambda x: x[1])

    segments: list[np.ndarray] = []

    i = 0
    while i + 2 < len(extrema):
        t1, i1 = extrema[i]
        t2, i2 = extrema[i + 1]
        t3, i3 = extrema[i + 2]

        # Need alternating types: peak-trough-peak or trough-peak-trough
        if t1 == t2 or t2 == t3:
            i += 1
            continue

        if i3 - i1 < min_samples:
            i += 1
            continue

        # Slice the 3-D trajectory for this rep cycle
        segments.append(trajectory_3d[i1: i3 + 1])
        i += 2  # consume the triplet

    # Fallback: if no full cycles, use half-cycles
    if len(segments) == 0:
        for j in range(len(extrema) - 1):
            t1, i1 = extrema[j]
            t2, i2 = extrema[j + 1]
            if t1 == t2:
                continue
            seg = trajectory_3d[i1: i2 + 1]
            if len(seg) >= min_samples:
                segments.append(seg)

    return segments


def analyze_workout(
    frames: list[dict],
    exercise_key: str,
) -> dict:
    """
    Full 3-D rep detection and accuracy analysis.

    Parameters
    ----------
    frames : list[dict]
        Sensor frames with keys: time, ax, ay, az, gx, gy, gz
    exercise_key : str
        Exercise identifier (e.g. "squats")

    Returns
    -------
    dict with keys:
        reps, accuracy, rep_scores, detected_segments,
        golden_signal   —  3-D golden template (list of [ax,ay,az])
        user_signals    —  list of per-rep 3-D trajectories
    """
    template = GOLDEN_REP_TEMPLATES.get(exercise_key)
    if not template or len(frames) < 20:
        return {
            "reps": 0, "accuracy": 0, "rep_scores": [],
            "detected_segments": 0, "golden_signal": [],
            "user_signals": [],
        }

    # ── 1. Extract full 3-axis trajectory ────────────────────────────────
    raw_3d = extract_3d_trajectory(frames)  # (N, 3)

    # ── 2. Remove gravity bias (per-axis mean subtraction) ───────────────
    means = np.mean(raw_3d, axis=0)  # (3,)
    debiased_3d = raw_3d - means

    # ── 3. Smooth each axis ──────────────────────────────────────────────
    smoothed_3d = moving_average_3d(debiased_3d, 7)  # (N, 3)

    # ── 4. Per-axis normalise to [−1, +1] ────────────────────────────────
    normed_3d = normalize_3d(smoothed_3d)  # (N, 3)

    # ── 5. Compute 1-D resultant for peak detection ──────────────────────
    resultant = resultant_magnitude(normed_3d)  # (N,)
    resultant_smooth = moving_average(resultant, 5)
    resultant_norm = normalize(resultant_smooth)

    # ── 6. Estimate sample rate ──────────────────────────────────────────
    times = np.array([f.get("time", 0) for f in frames], dtype=float)
    dur_ms = times[-1] - times[0] if len(times) > 1 else len(frames) * 20
    hz = (len(frames) / dur_ms) * 1000 if dur_ms > 0 else 50

    min_samples_per_rep = max(8, int(hz * template["expected_duration_ms"][0] / 1000))
    min_peak_dist = max(5, int(hz * 0.4))

    # ── 7. Detect peaks and troughs on the resultant ─────────────────────
    peak_prom = template["peak_threshold"]
    peaks, _ = find_peaks(resultant_norm, prominence=peak_prom, distance=min_peak_dist)
    troughs, _ = find_peaks(-resultant_norm, prominence=peak_prom, distance=min_peak_dist)

    # Relax threshold if too few
    if len(peaks) + len(troughs) < 4:
        peaks, _ = find_peaks(resultant_norm, prominence=peak_prom * 0.5, distance=min_peak_dist)
        troughs, _ = find_peaks(-resultant_norm, prominence=peak_prom * 0.5, distance=min_peak_dist)

    if len(peaks) + len(troughs) < 2:
        return {
            "reps": 0, "accuracy": 0, "rep_scores": [],
            "detected_segments": 0,
            "golden_signal": template["signal_3d"],
            "user_signals": [],
        }

    # ── 8. Segment the 3-D trajectory ────────────────────────────────────
    segments = _segment_reps_3d(
        normed_3d, resultant_norm, peaks, troughs, min_samples_per_rep,
    )

    if len(segments) == 0:
        # Fallback: estimate from half-cycle count
        half_cycles = max(len(peaks), len(troughs))
        if half_cycles == 0:
            return {
                "reps": 0, "accuracy": 0, "rep_scores": [],
                "detected_segments": 0,
                "golden_signal": template["signal_3d"],
                "user_signals": [],
            }
        sig_range = float(np.max(resultant_norm) - np.min(resultant_norm))
        rough = min(100, round(sig_range * 55))
        return {
            "reps": half_cycles,
            "accuracy": rough,
            "rep_scores": [rough] * half_cycles,
            "detected_segments": half_cycles,
            "golden_signal": template["signal_3d"],
            "user_signals": [],
        }

    # ── 9. 3-D DTW scoring ───────────────────────────────────────────────
    golden_3d = np.array(template["signal_3d"], dtype=float)  # (60, 3)

    # Per-axis normalise the golden template
    golden_normed = np.empty_like(golden_3d)
    for axis in range(golden_3d.shape[1]):
        col = golden_3d[:, axis]
        max_abs = np.max(np.abs(col))
        golden_normed[:, axis] = col / max_abs if max_abs > 0 else col

    rep_scores: list[int] = []
    user_signals: list[list[list[float]]] = []

    for seg in segments:
        seg_normed = normalize_3d(seg)  # (M, 3) per-axis normalised
        dist = dtw_distance(seg_normed, golden_normed)
        score = dtw_to_accuracy(dist)
        rep_scores.append(score)
        user_signals.append(seg_normed.tolist())

    accuracy = round(sum(rep_scores) / len(rep_scores)) if rep_scores else 0

    return {
        "reps": len(segments),
        "accuracy": accuracy,
        "rep_scores": rep_scores,
        "detected_segments": len(segments),
        "golden_signal": template["signal_3d"],
        "user_signals": user_signals,
    }
