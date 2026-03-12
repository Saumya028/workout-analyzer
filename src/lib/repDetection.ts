// src/lib/repDetection.ts
// Rep detection pipeline: smoothing → peak detection → segmentation → DTW scoring.
// SensorFrame is imported from sensorService (single source of truth).

import { SensorFrame } from './sensorService';
import { goldenRepTemplates, ExerciseKey } from './goldenRepTemplates';

export type { SensorFrame };   // re-export so existing imports don't break

export interface RepAnalysisResult {
  reps:              number;
  accuracy:          number;   // 0–100
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

// ─── Peak / trough detection ──────────────────────────────────────────────────

interface Peak { index: number; value: number; type: 'peak' | 'trough' }

function detectPeaks(
  signal:       number[],
  minProminence: number,
  minDistance:  number,
): Peak[] {
  const raw: Peak[] = [];

  for (let i = 1; i < signal.length - 1; i++) {
    const prev = signal[i - 1], curr = signal[i], next = signal[i + 1];
    if (curr > prev && curr > next) raw.push({ index: i, value: curr, type: 'peak'   });
    else if (curr < prev && curr < next) raw.push({ index: i, value: curr, type: 'trough' });
  }

  // Enforce minimum distance between same-type extrema
  const filtered: Peak[] = [];
  for (const c of raw) {
    const last = filtered[filtered.length - 1];
    if (!last || c.index - last.index >= minDistance) {
      filtered.push(c);
    } else if (
      (c.type === 'peak'   && c.value >  last.value) ||
      (c.type === 'trough' && c.value <  last.value)
    ) {
      filtered[filtered.length - 1] = c;
    }
  }

  return filtered.filter(p => Math.abs(p.value) >= minProminence);
}

// ─── Rep segmentation ─────────────────────────────────────────────────────────

function segmentReps(signal: number[], peaks: Peak[], minSamples: number): number[][] {
  const reps: number[][] = [];

  // Walk peaks alternating peak<->trough: each pair = one half-rep.
  // Two consecutive half-reps (peak→trough→peak or trough→peak→trough) = one full rep.
  for (let i = 0; i + 1 < peaks.length; i++) {
    const p1 = peaks[i], p2 = peaks[i + 1];
    // Only cross-type boundaries
    if (p1.type === p2.type) continue;
    // Full rep needs one more boundary
    if (i + 2 >= peaks.length) continue;
    const p3 = peaks[i + 2];
    if (p2.type === p3.type) continue;

    const start = p1.index;
    const end   = p3.index;
    if (end - start < minSamples) continue;

    reps.push(signal.slice(start, end + 1));
    i += 2; // consume the three peaks
  }

  // Fallback: if no full cycles detected, use half-cycles
  if (reps.length === 0) {
    for (let i = 0; i + 1 < peaks.length; i++) {
      const p1 = peaks[i], p2 = peaks[i + 1];
      if (p1.type === p2.type) continue;
      const seg = signal.slice(p1.index, p2.index + 1);
      if (seg.length >= minSamples) reps.push(seg);
    }
  }

  return reps;
}

// ─── Dynamic Time Warping ─────────────────────────────────────────────────────

function dtwDistance(a: number[], b: number[]): number {
  const n = a.length, m = b.length;
  if (!n || !m) return Infinity;

  const cost: number[][] = Array.from({ length: n }, () => new Array(m).fill(Infinity));
  cost[0][0] = Math.abs(a[0] - b[0]);
  for (let i = 1; i < n; i++) cost[i][0] = cost[i-1][0] + Math.abs(a[i] - b[0]);
  for (let j = 1; j < m; j++) cost[0][j] = cost[0][j-1] + Math.abs(a[0] - b[j]);

  for (let i = 1; i < n; i++)
    for (let j = 1; j < m; j++)
      cost[i][j] = Math.abs(a[i] - b[j]) + Math.min(cost[i-1][j], cost[i][j-1], cost[i-1][j-1]);

  return cost[n-1][m-1] / Math.max(n, m);
}

function dtwToAccuracy(dist: number, maxDist = 1.5): number {
  return Math.round(Math.max(0, 1 - dist / maxDist) * 100);
}

// ─── Main analysis ────────────────────────────────────────────────────────────

export function analyzeWorkout(
  frames:      SensorFrame[],
  exerciseKey: ExerciseKey,
): RepAnalysisResult {
  const template = goldenRepTemplates[exerciseKey];

  if (!template || frames.length < 20) {
    return { reps: 0, accuracy: 0, repScores: [], detectedSegments: 0 };
  }

  // 1. Extract axis & remove gravity bias
  const raw    = extractAxis(frames, template.primaryAxis);
  const mean   = raw.reduce((a, b) => a + b, 0) / raw.length;
  const debiased = raw.map(v => v - mean);

  // 2. Smooth + normalize
  const smoothed   = movingAverage(debiased, 7);
  const normalized = normalizeSignal(smoothed);

  // 3. Estimate sample rate
  const durMs = frames.length > 1
    ? frames[frames.length - 1].time - frames[0].time
    : frames.length * 20;
  const hz    = (frames.length / durMs) * 1000;

  const minSamplesPerRep = Math.max(8, Math.floor(hz * template.expectedDurationMs[0] / 1000));
  const minPeakDist      = Math.max(5, Math.floor(hz * 0.4));

  // 4. Detect peaks — try nominal threshold, then relax if too few
  let peaks = detectPeaks(normalized, template.peakThreshold, minPeakDist);
  if (peaks.length < 4) {
    peaks = detectPeaks(normalized, template.peakThreshold * 0.5, minPeakDist);
  }

  if (peaks.length < 2) {
    return { reps: 0, accuracy: 0, repScores: [], detectedSegments: 0 };
  }

  // 5. Segment into reps
  const segments = segmentReps(normalized, peaks, minSamplesPerRep);

  if (segments.length === 0) {
    // Absolute fallback: count alternating peak pairs
    const halfCycles = Math.floor(peaks.length / 2);
    if (!halfCycles) return { reps: 0, accuracy: 0, repScores: [], detectedSegments: 0 };
    const range = Math.max(...normalized) - Math.min(...normalized);
    const rough = Math.min(100, Math.round(range * 55));
    return { reps: halfCycles, accuracy: rough, repScores: Array(halfCycles).fill(rough), detectedSegments: halfCycles };
  }

  // 6. DTW score each rep vs golden template
  const golden = normalizeSignal(template.signal);
  const repScores = segments.map(seg => dtwToAccuracy(dtwDistance(normalizeSignal(seg), golden)));

  const accuracy = repScores.length
    ? Math.round(repScores.reduce((a, b) => a + b, 0) / repScores.length)
    : 0;

  return { reps: segments.length, accuracy, repScores, detectedSegments: segments.length };
}