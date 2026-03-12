# backend/golden_rep_engine/comparator.py
# ──────────────────────────────────────────────────────────────────────────────
# Compares a user's rep signal against the golden rep using:
#   1. Dynamic Time Warping (DTW)  — primary metric
#   2. Euclidean distance          — secondary
#   3. Cosine similarity           — secondary
# ──────────────────────────────────────────────────────────────────────────────

import numpy as np
from numpy.typing import NDArray


def dtw_distance(a: NDArray, b: NDArray) -> float:
    """
    Compute the Dynamic Time Warping distance between two 1-D signals.
    Returns the normalised cost (lower = more similar).
    """
    n, m = len(a), len(b)
    if n == 0 or m == 0:
        return float("inf")

    # Cost matrix
    cost = np.full((n, m), np.inf)
    cost[0, 0] = abs(a[0] - b[0])

    for i in range(1, n):
        cost[i, 0] = cost[i - 1, 0] + abs(a[i] - b[0])
    for j in range(1, m):
        cost[0, j] = cost[0, j - 1] + abs(a[0] - b[j])

    for i in range(1, n):
        for j in range(1, m):
            cost[i, j] = abs(a[i] - b[j]) + min(
                cost[i - 1, j], cost[i, j - 1], cost[i - 1, j - 1]
            )

    return float(cost[n - 1, m - 1] / max(n, m))


def dtw_to_accuracy(dist: float, max_dist: float = 1.5) -> int:
    """Convert DTW distance to a 0-100 accuracy score."""
    return round(max(0.0, 1.0 - dist / max_dist) * 100)


def euclidean_similarity(a: NDArray, b: NDArray) -> float:
    """
    Resample b to match len(a) then compute Euclidean distance,
    converted to a 0-100 similarity score.
    """
    if len(a) == 0 or len(b) == 0:
        return 0.0

    # Resample b to length of a
    b_resampled = np.interp(
        np.linspace(0, 1, len(a)),
        np.linspace(0, 1, len(b)),
        b,
    )
    dist = float(np.linalg.norm(a - b_resampled))
    max_dist = np.sqrt(len(a)) * 2  # theoretical max for [-1, +1] signals
    return round(max(0.0, 1.0 - dist / max_dist) * 100, 1)


def cosine_similarity(a: NDArray, b: NDArray) -> float:
    """
    Resample and compute cosine similarity (0-100 scale).
    """
    if len(a) == 0 or len(b) == 0:
        return 0.0

    b_resampled = np.interp(
        np.linspace(0, 1, len(a)),
        np.linspace(0, 1, len(b)),
        b,
    )
    dot = float(np.dot(a, b_resampled))
    norm_a = float(np.linalg.norm(a))
    norm_b = float(np.linalg.norm(b_resampled))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return round(max(0.0, dot / (norm_a * norm_b)) * 100, 1)


def compare_rep(
    user_signal: list[float],
    golden_signal: list[float],
) -> dict:
    """
    Full comparison of a single user rep vs. the golden rep.
    Returns DTW accuracy (primary) plus secondary metrics.
    """
    a = np.array(user_signal, dtype=float)
    b = np.array(golden_signal, dtype=float)

    # Normalize both to [-1, +1]
    a_max = np.max(np.abs(a)) if np.max(np.abs(a)) > 0 else 1.0
    b_max = np.max(np.abs(b)) if np.max(np.abs(b)) > 0 else 1.0
    a_norm = a / a_max
    b_norm = b / b_max

    dist = dtw_distance(a_norm, b_norm)

    return {
        "dtw_accuracy": dtw_to_accuracy(dist),
        "dtw_distance": round(dist, 4),
        "euclidean_similarity": euclidean_similarity(a_norm, b_norm),
        "cosine_similarity": cosine_similarity(a_norm, b_norm),
    }
