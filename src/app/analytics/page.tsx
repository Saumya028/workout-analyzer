// src/app/analytics/page.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Rep Analytics Dashboard — Workout history, summary stats, per-rep charts.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

import { useState, useEffect, useCallback } from 'react';
import RepChart from '../components/RepChart';

interface WorkoutRecord {
  id?: string;
  _id?: string;
  exercise: string;
  reps: number;
  accuracy: number;
  repScores?: number[];
  rep_scores?: number[];
  durationMs?: number;
  duration_ms?: number;
  createdAt?: string;
  created_at?: string;
}

const EXERCISE_NAMES: Record<string, string> = {
  squats: 'Squats', deadlift: 'Deadlift', chestPress: 'Chest Press',
  shoulderPress: 'Shoulder Press', latPulldown: 'Lat Pulldown',
  rowing: 'Rowing', bicepCurls: 'Bicep Curls', tricepsExtension: 'Triceps Extension',
};

export default function AnalyticsPage() {
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutRecord | null>(null);

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workout?limit=50');
      if (res.ok) {
        const data = await res.json();
        setWorkouts(data.workouts || []);
      }
    } catch {
      console.error('Failed to fetch workouts');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWorkouts(); }, [fetchWorkouts]);

  // Calculate aggregate stats
  const totalReps = workouts.reduce((sum, w) => sum + w.reps, 0);
  const avgAccuracy = workouts.length > 0
    ? Math.round(workouts.reduce((sum, w) => sum + w.accuracy, 0) / workouts.length)
    : 0;
  const bestAccuracy = workouts.length > 0
    ? Math.max(...workouts.map(w => w.accuracy))
    : 0;
  const totalWorkouts = workouts.length;

  const getRepScores = (w: WorkoutRecord) => w.repScores || w.rep_scores || [];
  const getDate = (w: WorkoutRecord) => {
    const d = w.createdAt || w.created_at;
    return d ? new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }) : '—';
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white">
            REP <span className="text-gradient-neon">ANALYTICS</span>
          </h1>
          <p className="text-dim text-sm font-mono mt-1">
            Workout history and performance tracking
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Workouts', value: totalWorkouts, color: 'text-azure' },
            { label: 'Total Reps', value: totalReps, color: 'text-neon' },
            { label: 'Avg Accuracy', value: `${avgAccuracy}%`, color: avgAccuracy >= 80 ? 'text-neon' : avgAccuracy >= 60 ? 'text-amber' : 'text-crimson' },
            { label: 'Best Accuracy', value: `${bestAccuracy}%`, color: 'text-neon' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-5 relative overflow-hidden">
              <div className="section-label mb-2">{label}</div>
              <div className={`text-3xl font-display font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Workout History List */}
          <div className="glass-card p-5">
            <div className="section-label mb-4">Workout History</div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-neon animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
                <span className="text-dim text-sm font-mono ml-2">Loading…</span>
              </div>
            ) : workouts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📊</div>
                <div className="text-ghost text-lg font-medium mb-2">No workouts yet</div>
                <p className="text-dim text-sm">Complete a workout to see your analytics here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {workouts.map((w, i) => {
                  const id = w.id || w._id || String(i);
                  const isSelected = selectedWorkout === w;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedWorkout(isSelected ? null : w)}
                      className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between gap-3 transition-all duration-200 ${
                        isSelected
                          ? 'bg-neon/10 border border-neon/30'
                          : 'bg-slate/30 border border-transparent hover:border-border hover:bg-slate/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          isSelected ? 'bg-neon/20' : 'bg-panel'
                        }`}>
                          🏋️
                        </div>
                        <div className="min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {EXERCISE_NAMES[w.exercise] || w.exercise}
                          </div>
                          <div className="text-dim text-xs font-mono">{getDate(w)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-white text-sm font-bold">{w.reps} reps</div>
                          <div className={`text-xs font-mono ${
                            w.accuracy >= 80 ? 'text-neon' : w.accuracy >= 60 ? 'text-amber' : 'text-crimson'
                          }`}>
                            {w.accuracy}%
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Workout Detail */}
          <div className="space-y-5">
            <div className="glass-card p-5">
              <div className="section-label mb-3">Rep Breakdown</div>
              {selectedWorkout ? (
                <RepChart repScores={getRepScores(selectedWorkout)} />
              ) : (
                <div className="h-48 flex items-center justify-center text-dim text-sm font-mono text-center">
                  Select a workout to see<br />rep-by-rep breakdown
                </div>
              )}
            </div>

            {selectedWorkout && (
              <div className="glass-card p-5">
                <div className="section-label mb-3">Session Details</div>
                <div className="space-y-3">
                  {[
                    { label: 'Exercise', value: EXERCISE_NAMES[selectedWorkout.exercise] || selectedWorkout.exercise },
                    { label: 'Reps Detected', value: String(selectedWorkout.reps) },
                    { label: 'Accuracy', value: `${selectedWorkout.accuracy}%` },
                    { label: 'Date', value: getDate(selectedWorkout) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-muted text-sm font-mono">{label}</span>
                      <span className="text-white text-sm font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
