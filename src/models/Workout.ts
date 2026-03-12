// src/models/Workout.ts
// Mongoose schema for workout sessions.

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkout extends Document {
  exercise: string;
  reps: number;
  accuracy: number;
  repScores: number[];
  detectedSegments: number;
  sensorData: {
    time: number;
    ax: number;
    ay: number;
    az: number;
    gx: number;
    gy: number;
    gz: number;
  }[];
  durationMs: number;
  createdAt: Date;
}

const SensorFrameSchema = new Schema(
  {
    time: { type: Number, required: true },
    ax: { type: Number, required: true },
    ay: { type: Number, required: true },
    az: { type: Number, required: true },
    gx: { type: Number, required: true },
    gy: { type: Number, required: true },
    gz: { type: Number, required: true },
  },
  { _id: false }
);

const WorkoutSchema = new Schema<IWorkout>(
  {
    exercise: {
      type: String,
      required: true,
      enum: [
        'chestPress',
        'shoulderPress',
        'latPulldown',
        'deadlift',
        'rowing',
        'bicepCurls',
        'tricepsExtension',
        'squats',
      ],
    },
    reps: { type: Number, required: true, min: 0 },
    accuracy: { type: Number, required: true, min: 0, max: 100 },
    repScores: { type: [Number], default: [] },
    detectedSegments: { type: Number, default: 0 },
    sensorData: {
      type: [SensorFrameSchema],
      default: [],
      // Store max 1000 frames per session to keep documents manageable
      validate: {
        validator: (v: unknown[]) => v.length <= 1000,
        message: 'sensorData exceeds maximum of 1000 frames',
      },
    },
    durationMs: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'workouts',
  }
);

// Index for efficient querying by exercise and date
WorkoutSchema.index({ exercise: 1, createdAt: -1 });

// Prevent model recompilation in Next.js dev mode
const Workout: Model<IWorkout> =
  (mongoose.models.Workout as Model<IWorkout>) || mongoose.model<IWorkout>('Workout', WorkoutSchema);

export default Workout;