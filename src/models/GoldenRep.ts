// src/models/GoldenRep.ts
// Mongoose schema for user-calibrated golden rep templates.
// One document per exercise — upserted on calibration.

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGoldenRep extends Document {
  exercise: string;
  signal6D: number[][];      // 60-point [ax,ay,az,gx,gy,gz] personal template
  avgScore: number;          // avg DTW score of the best reps used
  repsUsed: number;          // how many reps were averaged
  repScores: number[];       // individual scores of the reps used
  dominantAxis: number;      // 0-5 index of axis with highest variance (0=ax,3=gx,4=gy,5=gz)
  repDurationMs: number;     // duration of the calibration rep in milliseconds
  rawFrames: {               // raw sensor frames from the calibration recording
    time: number;
    ax: number; ay: number; az: number;
    gx: number; gy: number; gz: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const GoldenRepSchema = new Schema<IGoldenRep>(
  {
    exercise: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'chestPress', 'shoulderPress', 'latPulldown', 'deadlift',
        'rowing', 'bicepCurls', 'tricepsExtension', 'squats',
      ],
    },
    signal6D: {
      type: [[Number]],
      required: true,
      validate: {
        validator: (v: number[][]) => v.length >= 10 && v.length <= 200,
        message: 'signal6D must have 10-200 points',
      },
    },
    avgScore: { type: Number, required: true, min: 0, max: 100 },
    repsUsed: { type: Number, required: true, min: 1 },
    repScores: { type: [Number], default: [] },
    dominantAxis: { type: Number, default: 4, min: 0, max: 5 },  // default gy for bicep curls
    repDurationMs: { type: Number, default: 2000, min: 100 },
    rawFrames: {
      type: [{
        time: Number, ax: Number, ay: Number, az: Number,
        gx: Number, gy: Number, gz: Number,
        _id: false,
      }],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'golden_reps',
  }
);

GoldenRepSchema.index({ exercise: 1 }, { unique: true });

const GoldenRep: Model<IGoldenRep> =
  (mongoose.models.GoldenRep as Model<IGoldenRep>) || mongoose.model<IGoldenRep>('GoldenRep', GoldenRepSchema);

export default GoldenRep;
