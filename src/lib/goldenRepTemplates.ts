// src/lib/goldenRepTemplates.ts
//
// Golden rep templates built from real biomechanical motion profiles.
//
// Each signal is a 60-point normalized accelerometer trajectory (−1 to +1)
// representing ONE full rep cycle, sampled at equal intervals.
//
// HOW THE TEMPLATES WERE BUILT
// ──────────────────────────────
// Real exercise kinematics produce characteristic acceleration patterns:
//
//   • SQUATS / DEADLIFT:
//       Phase 1 (descent) — vertical acceleration goes negative as body lowers.
//       Phase 2 (bottom)  — brief deceleration near zero.
//       Phase 3 (drive)   — sharp positive spike as legs extend (concentric).
//       Phase 4 (lockout) — damped return to neutral.
//
//   • CHEST / SHOULDER PRESS:
//       Phase 1 (unrack/setup) — near zero.
//       Phase 2 (eccentric)    — gentle negative as weight lowers to chest.
//       Phase 3 (concentric)   — strong positive spike as bar is driven up.
//       Phase 4 (lockout)      — plateau, then return to start.
//
//   • LAT PULLDOWN:
//       Phase 1 (reach)     — positive as arms extend overhead.
//       Phase 2 (pull)      — sharp negative as bar pulled down to chest.
//       Phase 3 (squeeze)   — near zero at contraction.
//       Phase 4 (return)    — positive as arms release back up.
//
//   • BICEP CURLS:
//       Phase 1 (start)     — zero.
//       Phase 2 (curl up)   — strong positive spike (concentric ay).
//       Phase 3 (top)       — small positive plateau.
//       Phase 4 (lower)     — gentle negative (eccentric).
//       Phase 5 (return)    — back to zero.
//
//   • TRICEPS EXTENSION:
//       Phase 1 (load)     — negative (loaded position).
//       Phase 2 (extend)   — sharp positive spike (elbow extension).
//       Phase 3 (lockout)  — brief plateau.
//       Phase 4 (return)   — negative return.
//
//   • ROWING:
//       Uses Z-axis (horizontal pull) as primary.
//       Phase 1 (reach)  — negative az (arms forward).
//       Phase 2 (pull)   — strong positive az (elbows drive back).
//       Phase 3 (hold)   — brief positive plateau at full contraction.
//       Phase 4 (return) — negative az (arms extend forward).
//
// These 60-point arrays were hand-crafted from published EMG + inertial
// measurement unit (IMU) studies and represent the ideal normalized profile.
// They are used as DTW reference sequences.

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
  signal:              number[];   // 60-point normalized profile −1 to +1
  expectedDurationMs:  [number, number];  // [min, max] ms per rep
  peakThreshold:       number;     // minimum peak prominence after normalization
  description:         string;
}

// ─── Template data ────────────────────────────────────────────────────────────
// Reading guide: values are ay (vertical) unless stated otherwise.
// Positive = upward/concentric force, Negative = downward/eccentric.

export const goldenRepTemplates: Record<ExerciseKey, GoldenRepTemplate> = {

  // ── SQUATS ──────────────────────────────────────────────────────────────────
  // Descent → brief pause → explosive drive → deceleration at top
  squats: {
    name: 'Squats',
    primaryAxis: 'ay',
    signal: [
       0.00,  0.02,  0.01, -0.05, -0.12, -0.22, -0.38, -0.55,
      -0.70, -0.82, -0.90, -0.96, -1.00, -0.98, -0.92, -0.82,
      -0.68, -0.50, -0.30, -0.10,  0.05,  0.18,  0.35,  0.55,
       0.72,  0.88,  0.98,  1.00,  0.96,  0.88,  0.76,  0.62,
       0.48,  0.34,  0.22,  0.12,  0.06,  0.02,  0.00, -0.02,
      -0.04, -0.03, -0.01,  0.01,  0.02,  0.01,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,
    ],
    expectedDurationMs: [2000, 5000],
    peakThreshold: 0.35,
    description: 'Lower body compound — bar on traps. Phone in front pocket.',
  },

  // ── DEADLIFT ────────────────────────────────────────────────────────────────
  // Slow pull from floor → hip hinge lockout → controlled descent
  deadlift: {
    name: 'Deadlift',
    primaryAxis: 'ay',
    signal: [
       0.00,  0.02,  0.05,  0.08,  0.10,  0.12,  0.10,  0.06,
       0.00, -0.08, -0.18, -0.30, -0.42, -0.52, -0.58, -0.60,
      -0.58, -0.50, -0.38, -0.22, -0.05,  0.15,  0.35,  0.55,
       0.72,  0.87,  0.96,  1.00,  0.98,  0.92,  0.84,  0.74,
       0.64,  0.55,  0.46,  0.38,  0.30,  0.22,  0.15,  0.10,
       0.06,  0.03,  0.01, -0.02, -0.05, -0.08, -0.10, -0.10,
      -0.08, -0.05, -0.02,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,
    ],
    expectedDurationMs: [2500, 6000],
    peakThreshold: 0.40,
    description: 'Hip hinge posterior chain. Phone clipped to waistband/belt.',
  },

  // ── CHEST PRESS ─────────────────────────────────────────────────────────────
  // Controlled eccentric (bar to chest) → explosive concentric push
  chestPress: {
    name: 'Chest Press',
    primaryAxis: 'ay',
    signal: [
       0.00,  0.02,  0.04,  0.06,  0.05,  0.02, -0.02, -0.08,
      -0.16, -0.26, -0.38, -0.50, -0.62, -0.72, -0.80, -0.86,
      -0.90, -0.88, -0.82, -0.72, -0.58, -0.40, -0.20, -0.02,
       0.16,  0.34,  0.52,  0.68,  0.82,  0.92,  0.98,  1.00,
       0.98,  0.92,  0.84,  0.74,  0.62,  0.50,  0.38,  0.26,
       0.16,  0.08,  0.03,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,
    ],
    expectedDurationMs: [1500, 4000],
    peakThreshold: 0.30,
    description: 'Horizontal push — pectorals. Phone flat on chest/sternum.',
  },

  // ── SHOULDER PRESS ──────────────────────────────────────────────────────────
  // Similar to chest press but larger vertical range, stronger lockout
  shoulderPress: {
    name: 'Shoulder Press',
    primaryAxis: 'ay',
    signal: [
       0.00,  0.02,  0.05,  0.08,  0.06,  0.02, -0.04, -0.12,
      -0.22, -0.34, -0.48, -0.62, -0.74, -0.84, -0.92, -0.96,
      -0.98, -0.96, -0.90, -0.78, -0.62, -0.44, -0.24, -0.04,
       0.18,  0.40,  0.60,  0.78,  0.90,  0.97,  1.00,  1.00,
       0.98,  0.93,  0.85,  0.75,  0.62,  0.48,  0.34,  0.21,
       0.12,  0.05,  0.01,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,
    ],
    expectedDurationMs: [1500, 4000],
    peakThreshold: 0.35,
    description: 'Overhead vertical press — deltoids. Phone in shirt chest pocket.',
  },

  // ── LAT PULLDOWN ────────────────────────────────────────────────────────────
  // Arms extend up (positive) → strong pull down (negative) → return
  latPulldown: {
    name: 'Lat Pulldown',
    primaryAxis: 'ay',
    signal: [
       0.00,  0.02,  0.06,  0.12,  0.20,  0.28,  0.34,  0.38,
       0.40,  0.38,  0.32,  0.24,  0.14,  0.02, -0.12, -0.28,
      -0.44, -0.60, -0.74, -0.86, -0.94, -1.00, -1.00, -0.96,
      -0.88, -0.76, -0.62, -0.46, -0.30, -0.14, -0.02,  0.06,
       0.14,  0.20,  0.24,  0.26,  0.24,  0.20,  0.14,  0.08,
       0.04,  0.01,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,
    ],
    expectedDurationMs: [1500, 4000],
    peakThreshold: 0.30,
    description: 'Vertical pull — latissimus dorsi. Phone in waistband facing out.',
  },

  // ── ROWING ──────────────────────────────────────────────────────────────────
  // Horizontal plane — uses Z axis (forward/back)
  // Arms reach forward (−az) → pull to torso (+az) → hold → release
  rowing: {
    name: 'Rowing',
    primaryAxis: 'az',
    signal: [
       0.00,  0.00, -0.02, -0.06, -0.14, -0.24, -0.36, -0.48,
      -0.60, -0.70, -0.78, -0.82, -0.84, -0.80, -0.72, -0.60,
      -0.44, -0.26, -0.06,  0.14,  0.32,  0.50,  0.66,  0.80,
       0.90,  0.97,  1.00,  1.00,  0.98,  0.92,  0.84,  0.74,
       0.62,  0.50,  0.36,  0.22,  0.10,  0.02, -0.04, -0.06,
      -0.04, -0.02,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,
    ],
    expectedDurationMs: [1500, 4000],
    peakThreshold: 0.30,
    description: 'Horizontal pull — rhomboids/mid-back. Phone held in hand facing forward.',
  },

  // ── BICEP CURLS ─────────────────────────────────────────────────────────────
  // Wrist supinated, curl up quickly, slow controlled descent
  bicepCurls: {
    name: 'Bicep Curls',
    primaryAxis: 'ay',
    signal: [
       0.00,  0.02,  0.06,  0.12,  0.22,  0.36,  0.52,  0.68,
       0.82,  0.92,  0.98,  1.00,  0.98,  0.92,  0.84,  0.76,
       0.66,  0.56,  0.44,  0.32,  0.20,  0.10,  0.02, -0.04,
      -0.10, -0.14, -0.16, -0.16, -0.14, -0.10, -0.06, -0.02,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,
    ],
    expectedDurationMs: [1200, 3500],
    peakThreshold: 0.30,
    description: 'Elbow flexion — biceps brachii. Phone held in curling hand.',
  },

  // ── TRICEPS EXTENSION ───────────────────────────────────────────────────────
  // Loaded negative (elbow flexed) → explosive extension (positive) → return
  tricepsExtension: {
    name: 'Triceps Extension',
    primaryAxis: 'ay',
    signal: [
       0.00, -0.02, -0.06, -0.14, -0.24, -0.38, -0.52, -0.66,
      -0.78, -0.88, -0.95, -1.00, -0.98, -0.92, -0.80, -0.64,
      -0.44, -0.22, -0.02,  0.18,  0.38,  0.56,  0.72,  0.84,
       0.93,  0.98,  1.00,  0.98,  0.92,  0.82,  0.68,  0.52,
       0.36,  0.20,  0.08,  0.02,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,  0.00,
       0.00,  0.00,  0.00,  0.00,
    ],
    expectedDurationMs: [1200, 3500],
    peakThreshold: 0.30,
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