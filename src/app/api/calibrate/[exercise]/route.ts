// src/app/api/calibrate/[exercise]/route.ts
// DELETE /api/calibrate/:exercise — Remove a calibrated golden rep
// GET    /api/calibrate/:exercise — Get the stored golden rep signal6D

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import GoldenRep from '@/models/GoldenRep';
import { ExerciseKey } from '@/lib/goldenRepTemplates';

const VALID_EXERCISES: ExerciseKey[] = [
  'chestPress', 'shoulderPress', 'latPulldown', 'deadlift',
  'rowing', 'bicepCurls', 'tricepsExtension', 'squats',
];

type Params = { exercise: string };

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const { exercise } = await params;
  if (!VALID_EXERCISES.includes(exercise as ExerciseKey)) {
    return NextResponse.json({ error: 'Invalid exercise' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await GoldenRep.deleteOne({ exercise });
    return NextResponse.json({ success: true, exercise });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const { exercise } = await params;
  if (!VALID_EXERCISES.includes(exercise as ExerciseKey)) {
    return NextResponse.json({ error: 'Invalid exercise' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const goldenRep = await GoldenRep.findOne({ exercise })
      .select('exercise signal6D avgScore repsUsed repScores createdAt')
      .lean();

    if (!goldenRep) {
      return NextResponse.json({ found: false, exercise });
    }

    return NextResponse.json({ found: true, ...goldenRep });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
