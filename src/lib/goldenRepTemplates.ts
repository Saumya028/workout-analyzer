// src/lib/goldenRepTemplates.ts
//
// Golden rep templates with 6-axis (accel + gyro) profiles.
//
// Each signal6D is a 60-point normalized sensor trajectory
// with [ax, ay, az, gx, gy, gz] per sample.
//
// The signal (1-D primary axis) is retained for backward compatibility.
// signal6D is the primary reference for DTW scoring.

export type ExerciseKey =
  | 'chestPress'
  | 'shoulderPress'
  | 'latPulldown'
  | 'deadlift'
  | 'rowing'
  | 'bicepCurls'
  | 'tricepsExtension'
  | 'squats';

export interface GoldenRepTemplate {
  name:                string;
  primaryAxis:         'ax' | 'ay' | 'az';
  signal:              number[];       // 60-point 1-D primary axis (legacy)
  signal6D:            number[][];     // 60-point [ax,ay,az,gx,gy,gz]
  expectedDurationMs:  [number, number];
  peakThreshold:       number;
  description:         string;
}

// ─── Helper: build 6D signal from 1D primary profile ─────────────────────────

interface GyroParams {
  gxScale: number; gyScale: number; gzScale: number;
  gxPhase: number; gyPhase: number; gzPhase: number;
}

const GYRO_PROFILES: Record<string, GyroParams> = {
  standard: { gxScale: 0.60, gyScale: 0.25, gzScale: 0.15, gxPhase: 0.3, gyPhase: 1.0, gzPhase: 0.5 },
  press:    { gxScale: 0.50, gyScale: 0.10, gzScale: 0.20, gxPhase: 0.4, gyPhase: 1.2, gzPhase: 0.8 },
  pull:     { gxScale: 0.55, gyScale: 0.30, gzScale: 0.15, gxPhase: 0.2, gyPhase: 0.8, gzPhase: 0.4 },
  hinge:    { gxScale: 0.70, gyScale: 0.15, gzScale: 0.25, gxPhase: 0.1, gyPhase: 1.5, gzPhase: 0.6 },
  curl:     { gxScale: 0.80, gyScale: 0.10, gzScale: 0.10, gxPhase: 0.2, gyPhase: 0.5, gzPhase: 0.3 },
  row:      { gxScale: 0.40, gyScale: 0.35, gzScale: 0.30, gxPhase: 0.3, gyPhase: 0.7, gzPhase: 0.9 },
};

function build6D(
  primary: number[],
  secondaryScale: number,
  tertiaryScale: number,
  primaryIdx: number,
  gyroProfile: string,
): number[][] {
  const n = primary.length;
  const gp = GYRO_PROFILES[gyroProfile] ?? GYRO_PROFILES.standard;
  const result: number[][] = [];

  for (let i = 0; i < n; i++) {
    const t = i / Math.max(n - 1, 1);
    const p = primary[i];

    // Accel secondary/tertiary
    const sec = secondaryScale * Math.sin(2 * Math.PI * t * 2.0 + 0.5) * (0.3 + Math.abs(p));
    const ter = tertiaryScale * Math.cos(2 * Math.PI * t * 1.5) * (0.2 + Math.abs(p) * 0.5);

    const accel = [0, 0, 0];
    accel[primaryIdx] = p;
    accel[(primaryIdx + 1) % 3] = sec;
    accel[(primaryIdx + 2) % 3] = ter;

    // Gyroscope: derivative-coupled
    let dp = 0;
    if (i > 0 && i < n - 1) dp = (primary[i + 1] - primary[i - 1]) / 2;
    else if (i === 0 && n > 1) dp = primary[1] - primary[0];
    else if (i === n - 1 && n > 1) dp = primary[n - 1] - primary[n - 2];

    const gx = gp.gxScale * dp * 5.0 + gp.gxScale * 0.2 * Math.sin(2 * Math.PI * t * 1.5 + gp.gxPhase);
    const gy = gp.gyScale * Math.sin(2 * Math.PI * t * 2.0 + gp.gyPhase) * (0.3 + Math.abs(p));
    const gz = gp.gzScale * Math.cos(2 * Math.PI * t * 1.0 + gp.gzPhase) * (0.2 + Math.abs(dp) * 2.0);

    result.push([accel[0], accel[1], accel[2], gx, gy, gz]);
  }

  return result;
}

// ─── 1-D profiles ─────────────────────────────────────────────────────────────

const SQUAT_1D = [
   0.00,  0.02,  0.01, -0.05, -0.12, -0.22, -0.38, -0.55,
  -0.70, -0.82, -0.90, -0.96, -1.00, -0.98, -0.92, -0.82,
  -0.68, -0.50, -0.30, -0.10,  0.05,  0.18,  0.35,  0.55,
   0.72,  0.88,  0.98,  1.00,  0.96,  0.88,  0.76,  0.62,
   0.48,  0.34,  0.22,  0.12,  0.06,  0.02,  0.00, -0.02,
  -0.04, -0.03, -0.01,  0.01,  0.02,  0.01,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,
];

const DEADLIFT_1D = [
   0.00,  0.02,  0.05,  0.08,  0.10,  0.12,  0.10,  0.06,
   0.00, -0.08, -0.18, -0.30, -0.42, -0.52, -0.58, -0.60,
  -0.58, -0.50, -0.38, -0.22, -0.05,  0.15,  0.35,  0.55,
   0.72,  0.87,  0.96,  1.00,  0.98,  0.92,  0.84,  0.74,
   0.64,  0.55,  0.46,  0.38,  0.30,  0.22,  0.15,  0.10,
   0.06,  0.03,  0.01, -0.02, -0.05, -0.08, -0.10, -0.10,
  -0.08, -0.05, -0.02,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,
];

const CHEST_PRESS_1D = [
   0.00,  0.02,  0.04,  0.06,  0.05,  0.02, -0.02, -0.08,
  -0.16, -0.26, -0.38, -0.50, -0.62, -0.72, -0.80, -0.86,
  -0.90, -0.88, -0.82, -0.72, -0.58, -0.40, -0.20, -0.02,
   0.16,  0.34,  0.52,  0.68,  0.82,  0.92,  0.98,  1.00,
   0.98,  0.92,  0.84,  0.74,  0.62,  0.50,  0.38,  0.26,
   0.16,  0.08,  0.03,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,
];

const SHOULDER_PRESS_1D = [
   0.00,  0.02,  0.05,  0.08,  0.06,  0.02, -0.04, -0.12,
  -0.22, -0.34, -0.48, -0.62, -0.74, -0.84, -0.92, -0.96,
  -0.98, -0.96, -0.90, -0.78, -0.62, -0.44, -0.24, -0.04,
   0.18,  0.40,  0.60,  0.78,  0.90,  0.97,  1.00,  1.00,
   0.98,  0.93,  0.85,  0.75,  0.62,  0.48,  0.34,  0.21,
   0.12,  0.05,  0.01,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,
];

const LAT_PULLDOWN_1D = [
   0.00,  0.02,  0.06,  0.12,  0.20,  0.28,  0.34,  0.38,
   0.40,  0.38,  0.32,  0.24,  0.14,  0.02, -0.12, -0.28,
  -0.44, -0.60, -0.74, -0.86, -0.94, -1.00, -1.00, -0.96,
  -0.88, -0.76, -0.62, -0.46, -0.30, -0.14, -0.02,  0.06,
   0.14,  0.20,  0.24,  0.26,  0.24,  0.20,  0.14,  0.08,
   0.04,  0.01,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,
];

const ROWING_1D = [
   0.00,  0.00, -0.02, -0.06, -0.14, -0.24, -0.36, -0.48,
  -0.60, -0.70, -0.78, -0.82, -0.84, -0.80, -0.72, -0.60,
  -0.44, -0.26, -0.06,  0.14,  0.32,  0.50,  0.66,  0.80,
   0.90,  0.97,  1.00,  1.00,  0.98,  0.92,  0.84,  0.74,
   0.62,  0.50,  0.36,  0.22,  0.10,  0.02, -0.04, -0.06,
  -0.04, -0.02,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,
];

const BICEP_CURLS_1D = [
   0.00,  0.02,  0.06,  0.12,  0.22,  0.36,  0.52,  0.68,
   0.82,  0.92,  0.98,  1.00,  0.98,  0.92,  0.84,  0.76,
   0.66,  0.56,  0.44,  0.32,  0.20,  0.10,  0.02, -0.04,
  -0.10, -0.14, -0.16, -0.16, -0.14, -0.10, -0.06, -0.02,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,
];

const TRICEPS_EXT_1D = [
   0.00, -0.02, -0.06, -0.14, -0.24, -0.38, -0.52, -0.66,
  -0.78, -0.88, -0.95, -1.00, -0.98, -0.92, -0.80, -0.64,
  -0.44, -0.22, -0.02,  0.18,  0.38,  0.56,  0.72,  0.84,
   0.93,  0.98,  1.00,  0.98,  0.92,  0.82,  0.68,  0.52,
   0.36,  0.20,  0.08,  0.02,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
   0.00,  0.00,  0.00,  0.00,
];

// ─── Template data ────────────────────────────────────────────────────────────

export const goldenRepTemplates: Record<ExerciseKey, GoldenRepTemplate> = {

  squats: {
    name: 'Squats', primaryAxis: 'ay', signal: SQUAT_1D,
    signal6D: build6D(SQUAT_1D, 0.18, 0.10, 1, 'standard'),
    expectedDurationMs: [1500, 5000], peakThreshold: 0.20,
    description: 'Lower body compound — bar on traps. Phone in front pocket.',
  },

  deadlift: {
    name: 'Deadlift', primaryAxis: 'ay', signal: DEADLIFT_1D,
    signal6D: build6D(DEADLIFT_1D, 0.20, 0.12, 1, 'hinge'),
    expectedDurationMs: [2000, 6000], peakThreshold: 0.22,
    description: 'Hip hinge posterior chain. Phone clipped to waistband/belt.',
  },

  chestPress: {
    name: 'Chest Press', primaryAxis: 'ay', signal: CHEST_PRESS_1D,
    signal6D: build6D(CHEST_PRESS_1D, 0.15, 0.08, 1, 'press'),
    expectedDurationMs: [1200, 4000], peakThreshold: 0.18,
    description: 'Horizontal push — pectorals. Phone flat on chest/sternum.',
  },

  shoulderPress: {
    name: 'Shoulder Press', primaryAxis: 'ay', signal: SHOULDER_PRESS_1D,
    signal6D: build6D(SHOULDER_PRESS_1D, 0.16, 0.09, 1, 'press'),
    expectedDurationMs: [1200, 4000], peakThreshold: 0.20,
    description: 'Overhead vertical press — deltoids. Phone in shirt chest pocket.',
  },

  latPulldown: {
    name: 'Lat Pulldown', primaryAxis: 'ay', signal: LAT_PULLDOWN_1D,
    signal6D: build6D(LAT_PULLDOWN_1D, 0.14, 0.08, 1, 'pull'),
    expectedDurationMs: [1200, 4000], peakThreshold: 0.18,
    description: 'Vertical pull — latissimus dorsi. Phone in waistband facing out.',
  },

  rowing: {
    name: 'Rowing', primaryAxis: 'az', signal: ROWING_1D,
    signal6D: build6D(ROWING_1D, 0.22, 0.12, 2, 'row'),
    expectedDurationMs: [1200, 4000], peakThreshold: 0.18,
    description: 'Horizontal pull — rhomboids/mid-back. Phone held in hand facing forward.',
  },

  bicepCurls: {
    name: 'Bicep Curls', primaryAxis: 'ay', signal: BICEP_CURLS_1D,
    signal6D: build6D(BICEP_CURLS_1D, 0.12, 0.06, 1, 'curl'),
    expectedDurationMs: [2000, 4000], peakThreshold: 0.15,
    description: 'Elbow flexion — biceps brachii. Phone held in curling hand.',
  },

  tricepsExtension: {
    name: 'Triceps Extension', primaryAxis: 'ay', signal: TRICEPS_EXT_1D,
    signal6D: build6D(TRICEPS_EXT_1D, 0.14, 0.07, 1, 'curl'),
    expectedDurationMs: [2000, 4000], peakThreshold: 0.15,
    description: 'Elbow extension — triceps brachii. Phone in hand performing extension.',
  },
};

// ─── Exercise list for UI ─────────────────────────────────────────────────────

export const EXERCISE_LIST: { key: ExerciseKey; label: string; icon: string }[] = [
  { key: 'squats',           label: 'Squats',             icon: '🦵' },
  { key: 'deadlift',         label: 'Deadlift',           icon: '🔱' },
  { key: 'chestPress',       label: 'Chest Press',        icon: '🏋️' },
  { key: 'shoulderPress',    label: 'Shoulder Press',     icon: '💪' },
  { key: 'latPulldown',      label: 'Lat Pulldown',       icon: '⬇️' },
  { key: 'rowing',           label: 'Rowing',             icon: '🚣' },
  { key: 'bicepCurls',       label: 'Bicep Curls',        icon: '💪' },
  { key: 'tricepsExtension', label: 'Triceps Extension',  icon: '🦾' },
];
