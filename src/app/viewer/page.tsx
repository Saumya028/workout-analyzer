// src/app/viewer/page.tsx
// ──────────────────────────────────────────────────────────────────────────────
// 3D Motion Viewer — Compare user rep path vs golden rep path.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

import { useState, useMemo, lazy, Suspense } from 'react';
import { ExerciseKey, goldenRepTemplates, EXERCISE_LIST } from '@/lib/goldenRepTemplates';
import { SensorService } from '@/lib/sensorService';
import GoldenRepPreview from '../components/GoldenRepPreview';

const BarPath3D = lazy(() => import('../components/BarPath3D'));

type ViewMode = 'overlay' | 'split';

export default function ViewerPage() {
  const [exercise, setExercise] = useState<ExerciseKey>('squats');
  const [viewMode, setViewMode] = useState<ViewMode>('overlay');
  const [showGolden, setShowGolden] = useState(true);
  const [showUser, setShowUser] = useState(true);
  const [hasUserData, setHasUserData] = useState(false);

  const template = goldenRepTemplates[exercise];

  // Generate sample user data for demo
  const userFrames = useMemo(() => {
    return SensorService.generateTestData(exercise, 4);
  }, [exercise]);

  // Generate golden rep as sensor frames for 3D visualization
  const goldenFrames = useMemo(() => {
    const signal = template.signal;
    const frames = [];
    const t0 = Date.now();
    for (let i = 0; i < signal.length * 3; i++) {
      const si = i % signal.length;
      const v = signal[si];
      frames.push({
        time: t0 + i * 20,
        ax: 0.1 * Math.sin(i * 0.1),
        ay: v * 2.5,
        az: 0.2 * Math.cos(i * 0.1),
        gx: 0, gy: 0, gz: 0,
      });
    }
    return frames;
  }, [template]);

  const handleLoadDemo = () => {
    setHasUserData(true);
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white">
            3D <span className="text-gradient-neon">MOTION VIEWER</span>
          </h1>
          <p className="text-dim text-sm font-mono mt-1">
            Compare your movement path against the golden rep in 3D space
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Main 3D View */}
          <div className="space-y-5">
            {/* 3D Canvas */}
            <div className="glass-card overflow-hidden" style={{ height: '480px' }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="section-label">
                  {viewMode === 'overlay' ? 'Overlay Comparison' : 'Split View'}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-dim">Drag to rotate</span>
                </div>
              </div>

              {viewMode === 'overlay' ? (
                <div className="h-[calc(100%-44px)]">
                  <Suspense fallback={<LoadingFallback />}>
                    <BarPath3D
                      frames={hasUserData && showUser ? userFrames : []}
                      goldenFrames={showGolden ? goldenFrames : undefined}
                      isRecording={false}
                    />
                  </Suspense>
                </div>
              ) : (
                <div className="h-[calc(100%-44px)] grid grid-cols-2 gap-1 px-2 pb-2">
                  <div className="rounded-lg overflow-hidden border border-border">
                    <div className="text-center text-xs font-mono text-amber py-1 bg-panel">Golden Rep</div>
                    <Suspense fallback={<LoadingFallback />}>
                      <BarPath3D frames={goldenFrames} isRecording={false} />
                    </Suspense>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <div className="text-center text-xs font-mono text-neon py-1 bg-panel">Your Rep</div>
                    <Suspense fallback={<LoadingFallback />}>
                      <BarPath3D frames={hasUserData ? userFrames : []} isRecording={false} />
                    </Suspense>
                  </div>
                </div>
              )}
            </div>

            {/* Signal Preview */}
            <div className="glass-card p-5">
              <div className="section-label mb-3">Golden Rep Signal — {template.name}</div>
              <GoldenRepPreview signal={template.signal} height={80} />
              <div className="flex justify-between mt-2 text-xs font-mono text-dim">
                <span>Primary axis: {template.primaryAxis.toUpperCase()}</span>
                <span>{(template.expectedDurationMs[0]/1000).toFixed(1)}–{(template.expectedDurationMs[1]/1000).toFixed(1)}s per rep</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar — Controls */}
          <div className="space-y-5">
            {/* Exercise Selector */}
            <div className="glass-card p-5">
              <div className="section-label mb-3">Exercise</div>
              <div className="grid grid-cols-2 gap-2">
                {EXERCISE_LIST.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => { setExercise(key); setHasUserData(false); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-mono transition-all duration-200 ${
                      exercise === key
                        ? 'bg-neon/10 border border-neon/30 text-neon'
                        : 'bg-slate/30 border border-transparent text-ghost hover:border-border hover:text-silver'
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* View Controls */}
            <div className="glass-card p-5">
              <div className="section-label mb-3">View Mode</div>
              <div className="flex gap-2 mb-4">
                {(['overlay', 'split'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex-1 py-2 rounded-lg text-xs font-mono uppercase tracking-widest transition-all ${
                      viewMode === mode
                        ? 'bg-neon/10 border border-neon/30 text-neon'
                        : 'bg-slate/30 border border-transparent text-dim hover:text-silver'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-ghost">Show Golden Rep</span>
                  <ToggleSwitch checked={showGolden} onChange={setShowGolden} color="#FFB830" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-ghost">Show User Rep</span>
                  <ToggleSwitch checked={showUser} onChange={setShowUser} color="#00FFB2" />
                </label>
              </div>
            </div>

            {/* Load Demo */}
            <div className="glass-card p-5">
              <div className="section-label mb-3">Demo Data</div>
              <button
                onClick={handleLoadDemo}
                className="w-full btn-neon text-xs py-3"
              >
                {hasUserData ? '↻ Regenerate Demo' : '⚡ Load Demo Data'}
              </button>
              <p className="text-dim text-xs font-mono mt-2 text-center">
                Generates simulated {template.name.toLowerCase()} data
              </p>
            </div>

            {/* Legend */}
            <div className="glass-card p-5">
              <div className="section-label mb-3">Legend</div>
              <div className="space-y-2">
                {[
                  { color: '#FFB830', label: 'Golden Rep Path' },
                  { color: '#00FFB2', label: 'User Rep Path' },
                  { color: '#FF4060', label: 'X Axis' },
                  { color: '#3D8EFF', label: 'Z Axis' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-4 h-1 rounded" style={{ backgroundColor: color }} />
                    <span className="text-ghost text-xs font-mono">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <span className="text-dim text-xs font-mono">Loading 3D…</span>
    </div>
  );
}

function ToggleSwitch({
  checked, onChange, color = '#00FFB2',
}: {
  checked: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-all duration-200 relative ${
        checked ? '' : 'bg-slate'
      }`}
      style={checked ? { backgroundColor: color + '40' } : undefined}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow-sm"
        style={{
          left: checked ? '22px' : '2px',
          backgroundColor: checked ? color : '#475569',
        }}
      />
    </button>
  );
}
