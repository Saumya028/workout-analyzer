# backend/rep_detection/detector.py
# ──────────────────────────────────────────────────────────────────────────────
# Rep Detection Pipeline
#   1. Extract primary axis from sensor frames
#   2. Remove gravity bias (subtract mean)
#   3. Smooth with moving average
#   4. Normalize to [-1, +1]
#   5. Detect peaks/troughs with scipy.signal.find_peaks
#   6. Segment into full rep cycles
#   7. Score each rep against golden template via DTW
# ──────────────────────────────────────────────────────────────────────────────

import numpy as np
from scipy.signal import find_peaks

from .signal_utils import moving_average, normalize, extract_axis
from ..golden_rep_engine.templates import GOLDEN_REP_TEMPLATES
from ..golden_rep_engine.comparator import dtw_distance, dtw_to_accuracy


def _segment_reps(
    signal: np.ndarray,
    peak_indices: np.ndarray,
    trough_indices: np.ndarray,
    min_samples: int,
) -> list[np.ndarray]:
    """
    Segment a signal into full rep cycles using alternating peak/trough pairs.
    A full rep = peak → trough → peak (or trough → peak → trough).
    """
    # Merge peaks and troughs into an ordered list of extrema
    extrema = []
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

        # We need alternating types: peak-trough-peak or trough-peak-trough
        if t1 == t2 or t2 == t3:
            i += 1
            continue

        if i3 - i1 < min_samples:
            i += 1
            continue

        segments.append(signal[i1: i3 + 1])
        i += 2  # consume the triplet

    # Fallback: if no full cycles, use half-cycles
    if len(segments) == 0:
        for j in range(len(extrema) - 1):
            t1, i1 = extrema[j]
            t2, i2 = extrema[j + 1]
            if t1 == t2:
                continue
            seg = signal[i1: i2 + 1]
            if len(seg) >= min_samples:
                segments.append(seg)

    return segments


def analyze_workout(
    frames: list[dict],
    exercise_key: str,
) -> dict:
    """
    Full rep detection and accuracy analysis.

    Parameters
    ----------
    frames : list[dict]
        Sensor frames with keys: time, ax, ay, az, gx, gy, gz
    exercise_key : str
        Exercise identifier (e.g. "squats")

    Returns
    -------
    dict with keys: reps, accuracy, rep_scores, detected_segments,
                    golden_signal, user_signals
    """
    template = GOLDEN_REP_TEMPLATES.get(exercise_key)
    if not template or len(frames) < 20:
        return {
            "reps": 0, "accuracy": 0, "rep_scores": [],
            "detected_segments": 0, "golden_signal": [],
            "user_signals": [],
        }

    # 1. Extract primary axis and remove gravity bias
    raw = extract_axis(frames, template["primary_axis"])
    mean = float(np.mean(raw))
    debiased = raw - mean

    # 2. Smooth + normalize
    smoothed = moving_average(debiased, 7)
    normalized = normalize(smoothed)

    # 3. Estimate sample rate
    times = np.array([f.get("time", 0) for f in frames], dtype=float)
    dur_ms = times[-1] - times[0] if len(times) > 1 else len(frames) * 20
    hz = (len(frames) / dur_ms) * 1000 if dur_ms > 0 else 50

    min_samples_per_rep = max(8, int(hz * template["expected_duration_ms"][0] / 1000))
    min_peak_dist = max(5, int(hz * 0.4))

    # 4. Detect peaks and troughs
    peak_prom = template["peak_threshold"]
    peaks, _ = find_peaks(normalized, prominence=peak_prom, distance=min_peak_dist)
    troughs, _ = find_peaks(-normalized, prominence=peak_prom, distance=min_peak_dist)

    # Relax threshold if too few
    if len(peaks) + len(troughs) < 4:
        peaks, _ = find_peaks(normalized, prominence=peak_prom * 0.5, distance=min_peak_dist)
        troughs, _ = find_peaks(-normalized, prominence=peak_prom * 0.5, distance=min_peak_dist)

    if len(peaks) + len(troughs) < 2:
        return {
            "reps": 0, "accuracy": 0, "rep_scores": [],
            "detected_segments": 0,
            "golden_signal": template["signal"],
            "user_signals": [],
        }

    # 5. Segment into reps
    segments = _segment_reps(normalized, peaks, troughs, min_samples_per_rep)

    if len(segments) == 0:
        # Absolute fallback: count alternating peak pairs
        half_cycles = max(len(peaks), len(troughs))
        if half_cycles == 0:
            return {
                "reps": 0, "accuracy": 0, "rep_scores": [],
                "detected_segments": 0,
                "golden_signal": template["signal"],
                "user_signals": [],
            }
        sig_range = float(np.max(normalized) - np.min(normalized))
        rough = min(100, round(sig_range * 55))
        return {
            "reps": half_cycles,
            "accuracy": rough,
            "rep_scores": [rough] * half_cycles,
            "detected_segments": half_cycles,
            "golden_signal": template["signal"],
            "user_signals": [],
        }

    # 6. DTW score each segment vs golden template
    golden = normalize(np.array(template["signal"], dtype=float))
    rep_scores = []
    user_signals = []

    for seg in segments:
        seg_norm = normalize(seg)
        dist = dtw_distance(seg_norm, golden)
        score = dtw_to_accuracy(dist)
        rep_scores.append(score)
        user_signals.append(seg_norm.tolist())

    accuracy = round(sum(rep_scores) / len(rep_scores)) if rep_scores else 0

    return {
        "reps": len(segments),
        "accuracy": accuracy,
        "rep_scores": rep_scores,
        "detected_segments": len(segments),
        "golden_signal": template["signal"],
        "user_signals": user_signals,
    }
