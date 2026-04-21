// src/app/api/calibrate/route.ts
// POST /api/calibrate — Record a personal golden rep (persisted to MongoDB)
// GET  /api/calibrate — List all calibrations

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import GoldenRep from '@/models/GoldenRep';
import { ExerciseKey } from '@/lib/goldenRepTemplates';
import type { SensorFrame } from '@/lib/sensorService';

const VALID_EXERCISES: ExerciseKey[] = [
  'chestPress', 'shoulderPress', 'latPulldown', 'deadlift',
  'rowing', 'bicepCurls', 'tricepsExtension', 'squats',
];

const GYRO_SCALE = 0.01;
const TARGET_POINTS = 60;

// ─── Signal helpers ─────────────────────────────────────────────────────────

function extract6D(frames: SensorFrame[]): number[][] {
  return frames.map(f => [
    f.ax, f.ay, f.az,
    f.gx * GYRO_SCALE, f.gy * GYRO_SCALE, f.gz * GYRO_SCALE,
  ]);
}

function movingAverageND(trajectory: number[][], windowSize: number): number[][] {
  if (!trajectory.length) return [];
  const d = trajectory[0].length;
  const result = trajectory.map(row => [...row]);
  const half = Math.floor(windowSize / 2);
  for (let axis = 0; axis < d; axis++) {
    for (let i = 0; i < trajectory.length; i++) {
      const s = Math.max(0, i - half);
      const e = Math.min(trajectory.length - 1, i + half);
      let sum = 0;
      for (let j = s; j <= e; j++) sum += trajectory[j][axis];
      result[i][axis] = sum / (e - s + 1);
    }
  }
  return result;
}

function resampleND(trajectory: number[][], targetLen: number): number[][] {
  const n = trajectory.length;
  if (n === targetLen) return trajectory;
  if (n === 0) return [];
  const result: number[][] = [];
  for (let i = 0; i < targetLen; i++) {
    const t = i / (targetLen - 1) * (n - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, n - 1);
    const frac = t - lo;
    result.push(trajectory[lo].map((v, k) => v + frac * (trajectory[hi][k] - v)));
  }
  return result;
}

function normalizeND(trajectory: number[][]): number[][] {
  if (!trajectory.length) return [];
  const d = trajectory[0].length;
  const result = trajectory.map(row => [...row]);
  for (let axis = 0; axis < d; axis++) {
    const col = trajectory.map(row => row[axis]);
    const maxAbs = Math.max(...col.map(Math.abs));
    if (maxAbs > 0) {
      for (let i = 0; i < trajectory.length; i++) {
        result[i][axis] = col[i] / maxAbs;
      }
    }
  }
  return result;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const exercise = body.exercise as ExerciseKey;
    const sensorData = body.sensorData as SensorFrame[];

    if (!exercise || !VALID_EXERCISES.includes(exercise)) {
      return NextResponse.json(
        { error: `Invalid exercise. Must be one of: ${VALID_EXERCISES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(sensorData) || sensorData.length < 10) {
      return NextResponse.json(
        { error: 'Not enough sensor data. Perform one full rep while recording.' },
        { status: 400 }
      );
    }

    // Single-rep calibration: the entire recording IS the golden rep.
    // No rep detection / segmentation needed — just extract, smooth, resample, normalize.
    const raw6D = extract6D(sensorData);

    // Remove per-axis mean (debias)
    const means = raw6D[0].map((_, axis) => {
      let sum = 0;
      for (const row of raw6D) sum += row[axis];
      return sum / raw6D.length;
    });
    const debiased = raw6D.map(row => row.map((v, axis) => v - means[axis]));

    // Smooth, resample to 60 points, normalize
    const smoothed = movingAverageND(debiased, 9);
    const resampled = resampleND(smoothed, TARGET_POINTS);
    const signal6D = normalizeND(resampled);

    // Compute dominant axis (axis with highest variance in debiased signal)
    const variances = Array.from({ length: 6 }, (_, axis) => {
      const col = debiased.map(row => row[axis]);
      const mean = col.reduce((a, b) => a + b, 0) / col.length;
      return col.reduce((sum, v) => sum + (v - mean) ** 2, 0) / col.length;
    });
    const dominantAxis = variances.indexOf(Math.max(...variances));

    // Rep duration = total recording time (single rep calibration)
    const repDurationMs = sensorData.length > 1
      ? sensorData[sensorData.length - 1].time - sensorData[0].time
      : 2000;

    // Persist to MongoDB (upsert — one golden rep per exercise)
    await connectToDatabase();
    await GoldenRep.findOneAndUpdate(
      { exercise },
      {
        exercise,
        signal6D,
        avgScore: 100,   // user's own rep is the reference — always 100%
        repsUsed: 1,
        repScores: [100],
        dominantAxis,
        repDurationMs,
        rawFrames: sensorData.length > 500
          ? sensorData.filter((_, i) => i % Math.ceil(sensorData.length / 500) === 0)
          : sensorData,
      },
      { upsert: true, new: true }
    );

    const durationSec = sensorData.length > 1
      ? ((sensorData[sensorData.length - 1].time - sensorData[0].time) / 1000).toFixed(1)
      : '?';

    const axisNames = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'];
    console.log(`[Calibrate] Saved golden rep for ${exercise}: ${sensorData.length} frames, ${durationSec}s, dominant=${axisNames[dominantAxis]}, repDur=${repDurationMs}ms`);

    return NextResponse.json({
      success: true,
      message: `Golden rep saved! Recorded ${durationSec}s of your perfect ${exercise} form.`,
      repsDetected: 1,
      repsUsed: 1,
      repScores: [100],
      avgScore: 100,
      exercise,
      durationSec,
      frames: sensorData.length,
      dominantAxis,
      repDurationMs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Calibrate] Error:', msg);
    return NextResponse.json({ error: `Calibration failed: ${msg}` }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const goldenReps = await GoldenRep.find()
      .select('exercise avgScore repsUsed createdAt updatedAt')
      .lean();

    const calibrations = goldenReps.map(g => ({
      exercise: g.exercise,
      avgScore: g.avgScore,
      repsUsed: g.repsUsed,
      createdAt: g.createdAt,
    }));

    return NextResponse.json({ calibrations });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
