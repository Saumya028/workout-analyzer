# backend/rep_detection/detector.py
# ──────────────────────────────────────────────────────────────────────────────
# 6-D Rep Detection Pipeline
#   1. Extract full (ax, ay, az, gx, gy, gz) trajectory from sensor frames
#   2. Remove bias (subtract per-axis mean)
#   3. Smooth each axis with moving average
#   4. Per-axis normalise to [-1, +1]
#   5. Compute resultant magnitude (accel only) for peak/trough detection
#   6. Detect peaks/troughs with scipy.signal.find_peaks on resultant
#   7. Segment the *6-D trajectory* using peak/trough indices
#   8. Score each 6-D segment against the golden template via 6-D DTW
# ──────────────────────────────────────────────────────────────────────────────

import numpy as np
from scipy.signal import find_peaks

from .signal_utils import (
    extract_6d_trajectory,
    extract_3d_trajectory,
    moving_average_nd,
    normalize_nd,
    resultant_magnitude,
    moving_average,
    normalize,
)
from ..golden_rep_engine.templates import GOLDEN_REP_TEMPLATES
from ..golden_rep_engine.comparator import dtw_distance, dtw_to_accuracy
from ..golden_rep_engine.calibration import get_golden_signal_6d


def _segment_reps_nd(
    trajectory_nd: np.ndarray,
    resultant_1d: np.ndarray,
    peak_indices: np.ndarray,
    trough_indices: np.ndarray,
    min_samples: int,
) -> list[np.ndarray]:
    """
    Segment an N-D trajectory (N, D) into full rep cycles using alternating
    peak/trough pairs detected on the 1-D resultant magnitude.

    A full rep = peak -> trough -> peak  (or trough -> peak -> trough).

    Returns a list of (M_i, D) sub-arrays — one per detected rep.
    """
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

        if t1 == t2 or t2 == t3:
            i += 1
            continue

        if i3 - i1 < min_samples:
            i += 1
            continue

        segments.append(trajectory_nd[i1: i3 + 1])
        i += 2

    # Fallback: if no full cycles, use half-cycles
    if len(segments) == 0:
        for j in range(len(extrema) - 1):
            t1, i1 = extrema[j]
            t2, i2 = extrema[j + 1]
            if t1 == t2:
                continue
            seg = trajectory_nd[i1: i2 + 1]
            if len(seg) >= min_samples:
                segments.append(seg)

    return segments


def analyze_workout(
    frames: list[dict],
    exercise_key: str,
) -> dict:
    """
    Full 6-D rep detection and accuracy analysis.

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
        golden_signal   —  6-D golden template (list of [ax,ay,az,gx,gy,gz])
        user_signals    —  list of per-rep 6-D trajectories
    """
    template = GOLDEN_REP_TEMPLATES.get(exercise_key)
    if not template or len(frames) < 20:
        return {
            "reps": 0, "accuracy": 0, "rep_scores": [],
            "detected_segments": 0, "golden_signal": [],
            "user_signals": [],
        }

    # ── 1. Estimate sample rate ────────────────────────────────────────
    times = np.array([f.get("time", 0) for f in frames], dtype=float)
    dur_ms = times[-1] - times[0] if len(times) > 1 else len(frames) * 20
    hz = (len(frames) / dur_ms) * 1000 if dur_ms > 0 else 50

    # ── 2. Peak detection on raw accel magnitude (debiased + smoothed) ──
    #    Raw magnitude is more robust than normalized 6D resultant which
    #    distorts amplitudes and creates spurious sub-rep peaks.
    accel = np.array([[f["ax"], f["ay"], f["az"]] for f in frames], dtype=float)
    raw_mag = np.linalg.norm(accel, axis=1)
    mag_debiased = raw_mag - np.mean(raw_mag)
    mag_smoothed = moving_average(mag_debiased, 21)
    mag_max = np.max(np.abs(mag_smoothed))
    mag_norm = mag_smoothed / mag_max if mag_max > 0 else mag_smoothed

    # ── 3. Find rep peaks — each local maximum = one rep ────────────────
    #    minPeakDist: 80% of expected rep duration (floor: 1.8 seconds).
    #    minHeight: 0.25 of normalized signal to ignore noise floor.
    min_peak_dist = max(
        int(hz * 1.8),
        int(hz * template["expected_duration_ms"][0] / 1000 * 0.8),
    )
    peaks, _ = find_peaks(mag_norm, height=0.25, distance=min_peak_dist)

    if len(peaks) == 0:
        return {
            "reps": 0, "accuracy": 0, "rep_scores": [],
            "detected_segments": 0,
            "golden_signal": template["signal_6d"],
            "user_signals": [],
        }

    # ── 4. Extract 6-axis trajectory for DTW scoring ────────────────────
    raw_6d = extract_6d_trajectory(frames)
    means = np.mean(raw_6d, axis=0)
    debiased_6d = raw_6d - means
    smoothed_6d = moving_average_nd(debiased_6d, 11)
    normed_6d = normalize_nd(smoothed_6d)

    # ── 5. Segment around each peak for DTW scoring ─────────────────────
    segments: list[np.ndarray] = []
    n = len(normed_6d)
    for i, pk in enumerate(peaks):
        start = 0 if i == 0 else (peaks[i - 1] + pk) // 2
        end = n if i == len(peaks) - 1 else (pk + peaks[i + 1]) // 2
        if end - start >= 4:
            segments.append(normed_6d[start:end])

    # ── 6. 6-D DTW scoring (prefer user calibration if available) ──────
    golden_signal = get_golden_signal_6d(exercise_key)
    golden_6d = np.array(golden_signal, dtype=float)  # (60, 6)
    golden_normed = normalize_nd(golden_6d)

    rep_scores: list[int] = []
    user_signals: list[list[list[float]]] = []

    for seg in segments:
        seg_normed = normalize_nd(seg)  # (M, 6)
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
        "golden_signal": template["signal_6d"],
        "user_signals": user_signals,
    }
