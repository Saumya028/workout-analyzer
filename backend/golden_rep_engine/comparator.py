# backend/golden_rep_engine/comparator.py
# ──────────────────────────────────────────────────────────────────────────────
# Multi-dimensional comparison of a user's rep against the golden rep:
#   1. Dynamic Time Warping (DTW)  — primary metric  (N-D Euclidean cost)
#       with Sakoe-Chiba band constraint for performance + accuracy
#   2. Euclidean distance          — secondary        (resampled N-D)
#   3. Cosine similarity           — secondary        (flattened N-D)
# ──────────────────────────────────────────────────────────────────────────────

import numpy as np
from numpy.typing import NDArray


# ── DTW with Sakoe-Chiba band ───────────────────────────────────────────────

def dtw_distance(
    a: NDArray,
    b: NDArray,
    band_ratio: float = 0.2,
) -> float:
    """
    Compute Dynamic Time Warping distance between two signals with a
    Sakoe-Chiba band constraint.

    Supports both 1-D (N,) and multi-dimensional (N, D) arrays.
    For multi-dimensional signals the point-wise cost is the Euclidean
    distance  ||a[i] - b[j]||_2.

    Parameters
    ----------
    a, b : NDArray
        Input signals.
    band_ratio : float
        Sakoe-Chiba band width as a fraction of max(n, m).
        Default 0.2 (20%) constrains the warping path to stay near
        the diagonal, improving both speed and alignment quality.

    Returns the normalised accumulated cost (lower = more similar).
    """
    if a.ndim == 1:
        a = a.reshape(-1, 1)
    if b.ndim == 1:
        b = b.reshape(-1, 1)

    n, m = len(a), len(b)
    if n == 0 or m == 0:
        return float("inf")

    # Sakoe-Chiba band width
    band = max(1, int(band_ratio * max(n, m)))

    cost = np.full((n, m), np.inf)
    cost[0, 0] = float(np.linalg.norm(a[0] - b[0]))

    for i in range(1, n):
        j_lo = max(0, int(i * m / n) - band)
        j_hi = min(m, int(i * m / n) + band + 1)
        if j_lo == 0:
            cost[i, 0] = cost[i - 1, 0] + float(np.linalg.norm(a[i] - b[0]))

    for j in range(1, m):
        i_lo = max(0, int(j * n / m) - band)
        i_hi = min(n, int(j * n / m) + band + 1)
        if i_lo == 0:
            cost[0, j] = cost[0, j - 1] + float(np.linalg.norm(a[0] - b[j]))

    for i in range(1, n):
        j_lo = max(1, int(i * m / n) - band)
        j_hi = min(m, int(i * m / n) + band + 1)
        for j in range(j_lo, j_hi):
            d = float(np.linalg.norm(a[i] - b[j]))
            cost[i, j] = d + min(
                cost[i - 1, j], cost[i, j - 1], cost[i - 1, j - 1]
            )

    return float(cost[n - 1, m - 1] / max(n, m))


def dtw_to_accuracy(dist: float, max_dist: float = 2.5) -> int:
    """
    Convert DTW distance to a 0-100 accuracy score.

    max_dist is calibrated for 6-axis signals (accel + gyro) where
    Euclidean distances are larger due to higher dimensionality.
    sqrt(6) ~ 2.45 scale factor for unit hypercube.
    """
    return round(max(0.0, 1.0 - dist / max_dist) * 100)


# ── Secondary Metrics ────────────────────────────────────────────────────────

def _resample_nd(signal: NDArray, target_len: int) -> NDArray:
    """
    Resample a (N, D) trajectory to (target_len, D) using linear interpolation
    on each axis independently.
    """
    if signal.ndim == 1:
        signal = signal.reshape(-1, 1)
    n, d = signal.shape
    xs_src = np.linspace(0, 1, n)
    xs_dst = np.linspace(0, 1, target_len)
    out = np.zeros((target_len, d))
    for axis in range(d):
        out[:, axis] = np.interp(xs_dst, xs_src, signal[:, axis])
    return out


def euclidean_similarity(a: NDArray, b: NDArray) -> float:
    """
    Resample b to match len(a), then compute total Euclidean distance
    across all axes.  Converted to a 0-100 similarity score.
    """
    if len(a) == 0 or len(b) == 0:
        return 0.0

    if a.ndim == 1:
        a = a.reshape(-1, 1)
    if b.ndim == 1:
        b = b.reshape(-1, 1)

    b_resampled = _resample_nd(b, len(a))
    diffs = np.linalg.norm(a - b_resampled, axis=1)
    dist = float(np.sum(diffs))
    d = a.shape[1]
    max_dist = len(a) * np.sqrt(d) * 2.0
    return round(max(0.0, 1.0 - dist / max_dist) * 100, 1)


def cosine_similarity(a: NDArray, b: NDArray) -> float:
    """
    Flatten both N-D trajectories and compute cosine similarity (0-100).
    """
    if len(a) == 0 or len(b) == 0:
        return 0.0

    if a.ndim == 1:
        a = a.reshape(-1, 1)
    if b.ndim == 1:
        b = b.reshape(-1, 1)

    b_resampled = _resample_nd(b, len(a))
    a_flat = a.flatten()
    b_flat = b_resampled.flatten()

    dot = float(np.dot(a_flat, b_flat))
    norm_a = float(np.linalg.norm(a_flat))
    norm_b = float(np.linalg.norm(b_flat))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return round(max(0.0, dot / (norm_a * norm_b)) * 100, 1)


# ── Public API ────────────────────────────────────────────────────────────────

def compare_rep(
    user_signal: list[list[float]] | list[float],
    golden_signal: list[list[float]] | list[float],
) -> dict:
    """
    Full comparison of a single user rep vs. the golden rep.

    Accepts either:
      - N-D signals: list of [ax, ay, az, gx, gy, gz] or [ax, ay, az]
      - 1-D signals: list of floats (legacy fallback)

    Returns DTW accuracy (primary) plus secondary metrics.
    """
    a = np.array(user_signal, dtype=float)
    b = np.array(golden_signal, dtype=float)

    if a.ndim == 1:
        a = a.reshape(-1, 1)
    if b.ndim == 1:
        b = b.reshape(-1, 1)

    # Per-axis magnitude normalization
    for axis in range(a.shape[1]):
        a_max = np.max(np.abs(a[:, axis]))
        if a_max > 0:
            a[:, axis] /= a_max
    for axis in range(b.shape[1]):
        b_max = np.max(np.abs(b[:, axis]))
        if b_max > 0:
            b[:, axis] /= b_max

    dist = dtw_distance(a, b)

    return {
        "dtw_accuracy": dtw_to_accuracy(dist),
        "dtw_distance": round(dist, 4),
        "euclidean_similarity": euclidean_similarity(a, b),
        "cosine_similarity": cosine_similarity(a, b),
    }
