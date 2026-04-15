// src/app/api/workout/route.ts
// POST /api/workout
// Receives sensor data, runs rep detection, stores results in MongoDB.

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Workout from '@/models/Workout';
import GoldenRep from '@/models/GoldenRep';
import { analyzeWorkout } from '@/lib/repDetection';
import { ExerciseKey } from '@/lib/goldenRepTemplates';
import type { SensorFrame } from '@/lib/sensorService';

export interface WorkoutRequestBody {
  exercise:   ExerciseKey;
  sensorData: SensorFrame[];
}

export interface WorkoutResponseBody {
  reps: number;
  accuracy: number;
  repScores: number[];
  detectedSegments: number;
  workoutId: string;
  message: string;
}

const VALID_EXERCISES: ExerciseKey[] = [
  'chestPress',
  'shoulderPress',
  'latPulldown',
  'deadlift',
  'rowing',
  'bicepCurls',
  'tricepsExtension',
  'squats',
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: WorkoutRequestBody = await request.json();

    // ── Validation ────────────────────────────────────────────────────────────
    if (!body.exercise || !VALID_EXERCISES.includes(body.exercise)) {
      return NextResponse.json(
        { error: `Invalid exercise. Must be one of: ${VALID_EXERCISES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.sensorData) || body.sensorData.length < 10) {
      return NextResponse.json(
        { error: 'Insufficient sensor data. Minimum 10 frames required.' },
        { status: 400 }
      );
    }

    console.log(
      `[API] Processing workout: exercise=${body.exercise}, frames=${body.sensorData.length}`
    );

    // ── Fetch personal golden rep (if calibrated) ────────────────────────────
    await connectToDatabase();
    let userGoldenRep6D: number[][] | undefined;
    try {
      const goldenRep = await GoldenRep.findOne({ exercise: body.exercise })
        .select('signal6D')
        .lean();
      if (goldenRep?.signal6D) {
        userGoldenRep6D = goldenRep.signal6D;
        console.log(`[API] Using personal golden rep for ${body.exercise}`);
      }
    } catch { /* fall back to default template */ }

    // ── Rep Detection & Analysis ──────────────────────────────────────────────
    const analysis = analyzeWorkout(body.sensorData, body.exercise, userGoldenRep6D);

    console.log(
      `[API] Analysis result: reps=${analysis.reps}, accuracy=${analysis.accuracy}%, ` +
        `segments=${analysis.detectedSegments}`
    );

    // ── Calculate duration ────────────────────────────────────────────────────
    const sortedFrames = [...body.sensorData].sort((a, b) => a.time - b.time);
    const durationMs =
      sortedFrames.length > 1
        ? sortedFrames[sortedFrames.length - 1].time - sortedFrames[0].time
        : 0;

    // ── Persist to MongoDB ────────────────────────────────────────────────────
    // (connection already established above for golden rep lookup)

    // Downsample sensor data to max 500 frames for storage efficiency
    const storageFrames =
      body.sensorData.length > 500
        ? body.sensorData.filter((_, i) => i % Math.ceil(body.sensorData.length / 500) === 0)
        : body.sensorData;

    const workout = await Workout.create({
      exercise: body.exercise,
      reps: analysis.reps,
      accuracy: analysis.accuracy,
      repScores: analysis.repScores,
      detectedSegments: analysis.detectedSegments,
      sensorData: storageFrames,
      durationMs,
    });

    console.log(`[API] Workout saved to MongoDB: id=${workout._id}`);

    // ── Response ──────────────────────────────────────────────────────────────
    const response: WorkoutResponseBody = {
      reps: analysis.reps,
      accuracy: analysis.accuracy,
      repScores: analysis.repScores,
      detectedSegments: analysis.detectedSegments,
      workoutId: workout._id.toString(),
      message: `Workout analyzed successfully. Detected ${analysis.reps} reps with ${analysis.accuracy}% accuracy.`,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API] Error processing workout:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to process workout: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET /api/workout - Fetch recent workout history
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const exercise = searchParams.get('exercise');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);

    await connectToDatabase();

    const query = exercise && VALID_EXERCISES.includes(exercise as ExerciseKey)
      ? { exercise }
      : {};

    const workouts = await Workout.find(query)
      .select('-sensorData') // exclude large sensor arrays from list view
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ workouts }, { status: 200 });
  } catch (error) {
    console.error('[API] Error fetching workouts:', error);
    return NextResponse.json({ error: 'Failed to fetch workout history' }, { status: 500 });
  }
}