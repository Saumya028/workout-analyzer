// src/lib/repDetection.ts
// Rep detection pipeline: smoothing -> peak detection -> segmentation -> DTW scoring.
// Supports 6-axis (accel + gyro) analysis with Sakoe-Chiba banded DTW.
// SensorFrame is imported from sensorService (single source of truth).

import { SensorFrame } from './sensorService';
import { goldenRepTemplates, ExerciseKey } from './goldenRepTemplates';

export type { SensorFrame };   // re-export so existing imports don't break

export interface RepAnalysisResult {
  reps:              number;
  accuracy:          number;   // 0-100
  repScores:         number[];
  detectedSegments:  number;
}

// ─── Signal utilities ─────────────────────────────────────────────────────────

export function movingAverage(signal: number[], windowSize: number): number[] {
  if (!signal.length) return [];
  const half = Math.floor(windowSize / 2);
  return signal.map((_, i) => {
    const s = Math.max(0, i - half);
    const e = Math.min(signal.length - 1, i + half);
    let sum = 0;
    for (let j = s; j <= e; j++) sum += signal[j];
    return sum / (e - s + 1);
  });
}

export function normalizeSignal(signal: number[]): number[] {
  if (!signal.length) return [];
  const maxAbs = Math.max(...signal.map(Math.abs));
  if (maxAbs === 0) return signal.map(() => 0);
  return signal.map(v => v / maxAbs);
}

export function extractAxis(frames: SensorFrame[], axis: 'ax' | 'ay' | 'az'): number[] {
  return frames.map(f => f[axis]);
}

// ─── N-D signal utilities ─────────────────────────────────────────────────────

const GYRO_SCALE = 0.01; // Match backend: 1 deg/s -> 0.01 normalised

function extract6D(frames: SensorFrame[]): number[][] {
  return frames.map(f => [
    f.ax, f.ay, f.az,
    f.gx * GYRO_SCALE, f.gy * GYRO_SCALE, f.gz * GYRO_SCALE,
  ]);
}

function movingAverageND(trajectory: number[][], windowSize: number): number[][] {
  if (!trajectory.length) return [];
  const d = trajectory[0].length;
  const result: number[][] = trajectory.map(row => [...row]);
  for (let axis = 0; axis < d; axis++) {
    const col = trajectory.map(row => row[axis]);
    const smoothed = movingAverage(col, windowSize);
    for (let i = 0; i < smoothed.length; i++) {
      result[i][axis] = smoothed[i];
    }
  }
  return result;
}

function normalizeND(trajectory: number[][]): number[][] {
  if (!trajectory.length) return [];
  const d = trajectory[0].length;
  const result: number[][] = trajectory.map(row => [...row]);
  for (let axis = 0; axis < d; axis++) {
    const col = trajectory.map(row => row[axis]);
    const maxAbs = Math.max(...col.map(Math.abs));
    if (maxAbs > 0) {
      for (let i = 0; i < trajectory.length; i++) {
        result[i][axis] = col[i] / maxAbs;
      }
    } else {
      for (let i = 0; i < trajectory.length; i++) {
        result[i][axis] = 0;
      }
    }
  }
  return result;
}

// ─── Peak detection (simplified for real phone data) ────────────────────────

interface Peak { index: number; value: number }

/**
 * Find local maxima in a signal with minimum distance and height constraints.
 * Designed for heavily smoothed resultant magnitude where each peak = one rep.
 */
function findRepPeaks(
  signal:    number[],
  minDist:   number,
  minHeight: number,
): Peak[] {
  const peaks: Peak[] = [];

  for (let i = 1; i < signal.length - 1; i++) {
    // Must be a local maximum
    if (signal[i] <= signal[i - 1] || signal[i] < signal[i + 1]) continue;
    // Must exceed minimum height
    if (signal[i] < minHeight) continue;

    const last = peaks[peaks.length - 1];
    if (last && i - last.index < minDist) {
      // Within minimum distance — keep the taller peak
      if (signal[i] > last.value) {
        peaks[peaks.length - 1] = { index: i, value: signal[i] };
      }
    } else {
      peaks.push({ index: i, value: signal[i] });
    }
  }

  return peaks;
}

// ─── Rep segmentation around peaks ──────────────────────────────────────────

/**
 * Segment the 6-D trajectory into per-rep slices by splitting at midpoints
 * between adjacent peaks. Each segment contains the data for one rep.
 */
function segmentAroundPeaks(trajectory: number[][], peaks: Peak[]): number[][][] {
  if (peaks.length === 0) return [];
  const n = trajectory.length;
  const reps: number[][][] = [];

  for (let i = 0; i < peaks.length; i++) {
    // Start = midpoint to previous peak (or beginning of data)
    const start = i === 0
      ? Math.max(0, peaks[i].index - Math.floor((peaks[i].index) / 2))
      : Math.floor((peaks[i - 1].index + peaks[i].index) / 2);
    // End = midpoint to next peak (or end of data)
    const end = i === peaks.length - 1
      ? Math.min(n, peaks[i].index + Math.floor((n - peaks[i].index) / 2))
      : Math.floor((peaks[i].index + peaks[i + 1].index) / 2);

    if (end - start >= 4) {
      reps.push(trajectory.slice(start, end));
    }
  }

  return reps;
}

// ─── Dynamic Time Warping with Sakoe-Chiba band ─────────────────────────────

function euclideanDist(a: number[], b: number[]): number {
  let sum = 0;
  for (let k = 0; k < a.length; k++) {
    const d = a[k] - b[k];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function dtwDistanceND(a: number[][], b: number[][], bandRatio = 0.2): number {
  const n = a.length, m = b.length;
  if (!n || !m) return Infinity;

  const band = Math.max(1, Math.floor(bandRatio * Math.max(n, m)));

  // Use flat array for cost matrix (performance)
  const cost = new Float64Array(n * m).fill(Infinity);
  const idx = (i: number, j: number) => i * m + j;

  cost[idx(0, 0)] = euclideanDist(a[0], b[0]);

  for (let i = 1; i < n; i++) {
    const jCenter = Math.floor(i * m / n);
    if (jCenter - band <= 0) {
      cost[idx(i, 0)] = cost[idx(i - 1, 0)] + euclideanDist(a[i], b[0]);
    }
  }

  for (let j = 1; j < m; j++) {
    const iCenter = Math.floor(j * n / m);
    if (iCenter - band <= 0) {
      cost[idx(0, j)] = cost[idx(0, j - 1)] + euclideanDist(a[0], b[j]);
    }
  }

  for (let i = 1; i < n; i++) {
    const jCenter = Math.floor(i * m / n);
    const jLo = Math.max(1, jCenter - band);
    const jHi = Math.min(m, jCenter + band + 1);
    for (let j = jLo; j < jHi; j++) {
      const d = euclideanDist(a[i], b[j]);
      cost[idx(i, j)] = d + Math.min(
        cost[idx(i - 1, j)],
        cost[idx(i, j - 1)],
        cost[idx(i - 1, j - 1)]
      );
    }
  }

  return cost[idx(n - 1, m - 1)] / Math.max(n, m);
}

function dtwToAccuracy(dist: number, maxDist = 3.5): number {
  // More forgiving scoring: real phone data diverges from synthetic templates.
  // When using a personal golden rep, maxDist can be lowered for stricter scoring.
  return Math.round(Math.max(0, 1 - dist / maxDist) * 100);
}

// ─── Autocorrelation for adaptive period estimation ─────────────────────────

/**
 * Estimate the dominant period (in samples) of a 1-D signal using autocorrelation.
 * Returns the lag of the first significant autocorrelation peak after lag 0.
 * Falls back to `fallbackSamples` if no clear period is found.
 */
function estimatePeriodAutocorr(signal: number[], minLag: number, maxLag: number, fallbackSamples: number): number {
  const n = signal.length;
  if (n < maxLag * 2) return fallbackSamples;

  // Compute autocorrelation for lags in [minLag, maxLag]
  const mean = signal.reduce((a, b) => a + b, 0) / n;
  const centered = signal.map(v => v - mean);

  // Normalization factor (variance at lag 0)
  let norm = 0;
  for (let i = 0; i < n; i++) norm += centered[i] * centered[i];
  if (norm === 0) return fallbackSamples;

  let bestLag = fallbackSamples;
  let bestCorr = 0.3; // minimum threshold to accept a period

  for (let lag = minLag; lag <= Math.min(maxLag, n - 1); lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += centered[i] * centered[i + lag];
    }
    corr /= norm;

    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  return bestLag;
}

// ─── Adaptive signal selection ──────────────────────────────────────────────

/**
 * Extract a 1-D signal for peak detection from the dominant axis.
 * If dominantAxis is a gyro axis (3-5), uses gyro directly.
 * If dominantAxis is an accel axis (0-2), uses accel magnitude.
 * Applies debiasing + heavy smoothing.
 */
function extractDominantSignal(
  frames: SensorFrame[],
  dominantAxis: number,
): number[] {
  const AXIS_KEYS: (keyof SensorFrame)[] = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'];

  if (dominantAxis >= 3) {
    // Gyro axis — extract directly (already in deg/s, large values)
    const key = AXIS_KEYS[dominantAxis];
    const raw = frames.map(f => Number(f[key]));
    const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
    const debiased = raw.map(v => v - mean);
    return movingAverage(debiased, 11);
  } else {
    // Accel axis — use magnitude (more robust than single axis)
    const rawMag = frames.map(f => Math.sqrt(f.ax * f.ax + f.ay * f.ay + f.az * f.az));
    const mean = rawMag.reduce((a, b) => a + b, 0) / rawMag.length;
    const debiased = rawMag.map(v => v - mean);
    return movingAverage(debiased, 21);
  }
}

/**
 * Auto-detect dominant axis from the workout data itself.
 * Returns the axis index (0-5) with highest variance.
 */
function detectDominantAxis(frames: SensorFrame[]): number {
  const AXIS_KEYS: (keyof SensorFrame)[] = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'];
  const SCALES = [1, 1, 1, 0.01, 0.01, 0.01]; // gyro scaled down to comparable range

  let bestAxis = 4; // default: gy
  let bestVar = 0;

  for (let a = 0; a < 6; a++) {
    const key = AXIS_KEYS[a];
    const vals = frames.map(f => Number(f[key]) * SCALES[a]);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    if (variance > bestVar) {
      bestVar = variance;
      bestAxis = a;
    }
  }

  return bestAxis;
}

// ─── Main analysis ────────────────────────────────────────────────────────────

export function analyzeWorkout(
  frames:      SensorFrame[],
  exerciseKey: ExerciseKey,
  userGoldenRep6D?: number[][],
  dominantAxis?: number,        // from calibration metadata
  repDurationMs?: number,       // from calibration metadata
): RepAnalysisResult {
  const template = goldenRepTemplates[exerciseKey];

  if (!template || frames.length < 20) {
    return { reps: 0, accuracy: 0, repScores: [], detectedSegments: 0 };
  }

  // 1. Estimate sample rate
  const durMs = frames.length > 1
    ? frames[frames.length - 1].time - frames[0].time
    : frames.length * 20;
  const hz = (frames.length / durMs) * 1000;

  // 2. Determine dominant axis for peak detection.
  //    Priority: calibration metadata > auto-detect from workout data.
  const effDominantAxis = dominantAxis ?? detectDominantAxis(frames);

  // 3. Extract dominant signal for peak detection
  const dominantSignal = extractDominantSignal(frames, effDominantAxis);
  const domNorm = normalizeSignal(dominantSignal);

  // 4. Estimate rep period using autocorrelation on the dominant signal.
  //    Use calibration repDurationMs as a guide for search range, but allow
  //    the actual signal to determine the true period (people speed up/slow down).
  const calibSamples = repDurationMs ? Math.round(hz * repDurationMs / 1000) : undefined;
  const minLag = Math.max(3, Math.floor(hz * 0.4));  // minimum 0.4s per rep
  const maxLag = Math.min(frames.length / 2, Math.floor(hz * 8)); // maximum 8s per rep
  const fallback = calibSamples ?? Math.floor(hz * template.expectedDurationMs[0] / 1000);
  const estimatedPeriod = estimatePeriodAutocorr(domNorm, minLag, maxLag, fallback);

  // 5. Find rep peaks with adaptive minPeakDist = 60% of estimated period.
  //    This allows for natural variation in rep speed while preventing double-counting.
  const minPeakDist = Math.max(3, Math.floor(estimatedPeriod * 0.6));
  const peaks = findRepPeaks(domNorm, minPeakDist, 0.20);

  // 5b. Also try inverted signal (troughs as peaks) and pick whichever gives
  //     a count closer to duration/period estimate (handles axis sign ambiguity).
  const domNormInv = domNorm.map(v => -v);
  const peaksInv = findRepPeaks(domNormInv, minPeakDist, 0.20);

  const expectedReps = durMs / (estimatedPeriod / hz * 1000);
  const usePeaks = Math.abs(peaks.length - expectedReps) <= Math.abs(peaksInv.length - expectedReps)
    ? peaks : peaksInv;

  if (usePeaks.length === 0) {
    return { reps: 0, accuracy: 0, repScores: [], detectedSegments: 0 };
  }

  // 6. Extract 6-axis trajectory for DTW scoring
  const raw6D = extract6D(frames);
  const means = raw6D[0].map((_, axis) => {
    let sum = 0;
    for (const row of raw6D) sum += row[axis];
    return sum / raw6D.length;
  });
  const debiased = raw6D.map(row => row.map((v, axis) => v - means[axis]));
  const smoothed   = movingAverageND(debiased, 11);
  const normalized = normalizeND(smoothed);

  // 7. Segment around each peak for DTW scoring
  const segments = segmentAroundPeaks(normalized, usePeaks);

  // 8. DTW score each rep vs golden template (6-D)
  const hasPersonalRep = userGoldenRep6D && userGoldenRep6D.length >= 10;
  const golden6D = hasPersonalRep ? userGoldenRep6D : template.signal6D;
  const goldenNormed = normalizeND(golden6D);
  const maxDist = hasPersonalRep ? 2.5 : 3.5;

  const repScores = segments.map(seg =>
    dtwToAccuracy(dtwDistanceND(normalizeND(seg), goldenNormed), maxDist)
  );

  const accuracy = repScores.length
    ? Math.round(repScores.reduce((a, b) => a + b, 0) / repScores.length)
    : 0;

  return { reps: segments.length, accuracy, repScores, detectedSegments: segments.length };
}
