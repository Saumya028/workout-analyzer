// src/app/workout/page.tsx
'use client';

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import ExerciseSelector from '../components/ExerciseSelector';
import StatsCards from '../components/StatsCards';
import { ExerciseKey, goldenRepTemplates } from '@/lib/goldenRepTemplates';
import { SensorService, SensorFrame, sensorService } from '@/lib/sensorService';
import type { WorkoutResponseBody } from '../api/workout/route';

const BarPath3D = lazy(() => import('../components/BarPath3D'));

type WorkoutState = 'idle' | 'recording' | 'analyzing' | 'results' | 'error';

interface WorkoutResult {
  reps: number;
  accuracy: number;
  repScores: number[];
  detectedSegments: number;
  workoutId: string;
}

// ─── Live Signal Canvas ───────────────────────────────────────────────────────

function SignalChart({ frames }: { frames: SensorFrame[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Zero line
    ctx.beginPath();
    ctx.strokeStyle = '#2A3441';
    ctx.lineWidth = 1;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (frames.length < 2) return;

    const recent = frames.slice(-300);
    const ayVals = recent.map(f => f.ay);
    const maxAy = Math.max(...ayVals.map(Math.abs), 0.1);

    // Gyro X (dim blue)
    const maxGx = Math.max(...recent.map(f => Math.abs(f.gx)), 1);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(61,142,255,0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < recent.length; i++) {
      const x = (i / (recent.length - 1)) * width;
      const y = height / 2 - (recent[i].gx / maxGx) * (height / 2 - 4);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Accel Y (neon green)
    ctx.beginPath();
    ctx.strokeStyle = '#00FFB2';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00FFB2';
    ctx.shadowBlur = 4;
    for (let i = 0; i < recent.length; i++) {
      const x = (i / (recent.length - 1)) * width;
      const y = height / 2 - (recent[i].ay / maxAy) * (height / 2 - 4);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [frames]);

  return (
    <div className="space-y-1">
      <canvas ref={canvasRef} width={600} height={70} className="w-full h-16 rounded-lg bg-obsidian" />
      <div className="flex gap-4 text-xs font-mono">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 rounded" style={{backgroundColor:'#00FFB2'}} />
          <span className="text-dim">Accel Y</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 rounded opacity-60" style={{backgroundColor:'#3D8EFF'}} />
          <span className="text-dim">Gyro X</span>
        </span>
        {frames.length > 0 && (
          <span className="text-muted ml-auto tabular-nums">
            ay={frames[frames.length-1].ay.toFixed(2)} gz={frames[frames.length-1].gz.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Sensor Status Banner ─────────────────────────────────────────────────────

function SensorStatusBanner({ isHttps }: { isHttps: boolean }) {
  if (isHttps) return null;
  return (
    <div className="bg-amber/10 border border-amber/40 rounded-xl px-4 py-3">
      <div className="text-amber text-xs font-mono font-bold mb-1">⚠ PHONE SENSOR NOTICE</div>
      <div className="text-silver text-sm leading-relaxed">
        You are on <span className="font-mono text-amber">HTTP</span> — mobile sensors require <span className="font-mono text-neon">HTTPS</span> to work on phones.
      </div>
      <div className="mt-2 text-xs font-mono text-dim space-y-0.5">
        <div>• Use <span className="text-neon">⚡ TEST MODE</span> on this device (simulated data)</div>
        <div>• Or deploy to a HTTPS URL (Vercel, ngrok) to use real phone sensors</div>
        <div>• Or run: <span className="text-amber">npx ngrok http 3000</span> for instant HTTPS tunnel</div>
      </div>
    </div>
  );
}

// ─── Controls ─────────────────────────────────────────────────────────────────

interface ControlsProps {
  state: WorkoutState;
  isHttps: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onTestMode: () => void;
}

function WorkoutControls({ state, isHttps, onStart, onStop, onReset, onTestMode }: ControlsProps) {
  const isIdle = state === 'idle' || state === 'results' || state === 'error';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {isIdle && (
          <button
            onClick={onStart}
            disabled={!isHttps}
            title={!isHttps ? 'Requires HTTPS — use Test Mode instead' : undefined}
            className={`flex-1 h-14 rounded-xl font-mono font-bold text-sm tracking-widest uppercase border transition-all duration-200 active:scale-95
              ${isHttps
                ? 'border-neon text-neon hover:bg-neon/10 hover:shadow-neon-md'
                : 'border-border text-muted cursor-not-allowed opacity-50'}`}
          >
            {isHttps ? '▶ START WORKOUT' : '🔒 NEEDS HTTPS'}
          </button>
        )}

        {state === 'recording' && (
          <button onClick={onStop}
            className="flex-1 h-14 rounded-xl font-mono font-bold text-sm tracking-widest uppercase border border-crimson text-crimson hover:bg-crimson/10 transition-all active:scale-95">
            ■ STOP &amp; ANALYZE
          </button>
        )}

        {state === 'analyzing' && (
          <div className="flex-1 h-14 rounded-xl border border-amber/50 flex items-center justify-center gap-3">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber animate-bounce"
                style={{animationDelay:`${i*0.15}s`}} />
            ))}
            <span className="text-amber text-xs font-mono tracking-widest">ANALYZING…</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {(state === 'results' || state === 'error') && (
          <button onClick={onReset}
            className="flex-1 h-10 rounded-lg border border-border text-dim text-xs font-mono tracking-widest uppercase hover:border-muted hover:text-ghost transition-all active:scale-95">
            ↺ NEW WORKOUT
          </button>
        )}
        {isIdle && (
          <button onClick={onTestMode}
            className="flex-1 h-10 rounded-lg border border-neon/40 text-neon/80 text-xs font-mono tracking-widest uppercase hover:border-neon hover:text-neon hover:bg-neon/5 transition-all active:scale-95">
            ⚡ TEST MODE (simulated)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const [exercise,     setExercise]     = useState<ExerciseKey>('squats');
  const [workoutState, setWorkoutState] = useState<WorkoutState>('idle');
  const [frames,       setFrames]       = useState<SensorFrame[]>([]);
  const [liveFrames,   setLiveFrames]   = useState<SensorFrame[]>([]);
  const [result,       setResult]       = useState<WorkoutResult | null>(null);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [frameCount,   setFrameCount]   = useState(0);
  const [isHttps,      setIsHttps]      = useState(false);

  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsHttps(
      typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    );
  }, []);

  const sendToApi = useCallback(async (ex: ExerciseKey, capturedFrames: SensorFrame[]) => {
    const res = await fetch('/api/workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise: ex, sensorData: capturedFrames }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<WorkoutResponseBody>;
  }, []);

  const handleStart = useCallback(async () => {
    setResult(null); setErrorMsg(''); setFrames([]); setLiveFrames([]); setFrameCount(0);
    setWorkoutState('recording');

    const ok = await sensorService.requestPermissionAndStart(
      () => { setFrameCount(sensorService.getFrameCount()); },
      (err) => { setErrorMsg(err); setWorkoutState('error'); }
    );
    if (!ok) return;

    liveTimerRef.current = setInterval(() => {
      setLiveFrames(sensorService.getCurrentFrames());
    }, 150);
  }, []);

  const handleStop = useCallback(async () => {
    if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null; }
    const captured = sensorService.stop();
    setFrames(captured); setLiveFrames(captured);
    setWorkoutState('analyzing');

    if (captured.length < 10) {
      setErrorMsg('Not enough sensor data. Make sure you\'re on HTTPS and the phone is moving.');
      setWorkoutState('error');
      return;
    }

    try {
      const data = await sendToApi(exercise, captured);
      setResult({ reps: data.reps, accuracy: data.accuracy, repScores: data.repScores, detectedSegments: data.detectedSegments, workoutId: data.workoutId });
      setWorkoutState('results');
    } catch (err) {
      setErrorMsg('Analysis failed: ' + (err instanceof Error ? err.message : String(err)));
      setWorkoutState('error');
    }
  }, [exercise, sendToApi]);

  const handleReset = useCallback(() => {
    setResult(null); setErrorMsg(''); setFrames([]); setLiveFrames([]); setFrameCount(0);
    setWorkoutState('idle');
  }, []);

  const handleTestMode = useCallback(async () => {
    setResult(null); setErrorMsg('');
    setWorkoutState('analyzing');
    const testFrames = SensorService.generateTestData(exercise, 6);
    setFrames(testFrames); setLiveFrames(testFrames);
    try {
      const data = await sendToApi(exercise, testFrames);
      setResult({ reps: data.reps, accuracy: data.accuracy, repScores: data.repScores, detectedSegments: data.detectedSegments, workoutId: data.workoutId });
      setWorkoutState('results');
    } catch (err) {
      setErrorMsg('Test failed: ' + (err instanceof Error ? err.message : String(err)));
      setWorkoutState('error');
    }
  }, [exercise, sendToApi]);

  useEffect(() => () => {
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    if (sensorService.getIsRecording()) sensorService.stop();
  }, []);

  const isRecording   = workoutState === 'recording';
  const displayFrames = isRecording ? liveFrames : frames;
  const tpl           = goldenRepTemplates[exercise];
  const lastFrame     = displayFrames[displayFrames.length - 1] ?? null;

  return (
    <div className="min-h-screen bg-obsidian pt-16">
      <div className="fixed inset-0 pointer-events-none"
        style={{background:'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,255,178,0.04) 0%, transparent 70%)'}} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-white">
            WORKOUT <span className="text-neon">ANALYZER</span>
          </h1>
          <p className="text-dim text-sm font-mono mt-1">
            Accelerometer (ax, ay, az) + Gyroscope (gx, gy, gz) — 6-axis motion capture
          </p>
        </div>

        {/* HTTPS warning for phone sensors */}
        <div className="mb-5">
          <SensorStatusBanner isHttps={isHttps} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left column */}
          <div className="space-y-5">

            <div className="bg-panel border border-border rounded-2xl p-5">
              <ExerciseSelector selected={exercise} onChange={setExercise} disabled={isRecording} />
            </div>

            <div className="bg-panel border border-border rounded-2xl p-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-dim text-xs font-mono tracking-widest uppercase mb-1">Exercise</div>
                <div className="text-2xl font-display font-bold text-white">{tpl.name}</div>
                <div className="text-ghost text-sm mt-1">{tpl.description}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-dim text-xs font-mono tracking-widest uppercase mb-1">Primary Axis</div>
                <div className="text-neon font-mono font-bold text-lg uppercase">{tpl.primaryAxis}</div>
                <div className="text-dim text-xs font-mono mt-1">
                  {(tpl.expectedDurationMs[0]/1000).toFixed(1)}–{(tpl.expectedDurationMs[1]/1000).toFixed(1)}s/rep
                </div>
              </div>
            </div>

            <div className="bg-panel border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-dim text-xs font-mono tracking-widest uppercase">Live Sensor Signal</div>
                {isRecording && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-crimson animate-pulse" />
                    <span className="text-crimson text-xs font-mono">LIVE • {frameCount} frames</span>
                  </div>
                )}
              </div>
              <SignalChart frames={displayFrames} />
              {displayFrames.length === 0 && (
                <div className="text-muted text-xs font-mono text-center mt-2">
                  Start a workout to see live sensor data
                </div>
              )}
            </div>

            <div className="bg-panel border border-border rounded-2xl p-5">
              <WorkoutControls
                state={workoutState}
                isHttps={isHttps}
                onStart={handleStart}
                onStop={handleStop}
                onReset={handleReset}
                onTestMode={handleTestMode}
              />
            </div>

            {workoutState === 'error' && errorMsg && (
              <div className="bg-crimson/10 border border-crimson/50 rounded-xl px-4 py-3">
                <div className="text-crimson text-xs font-mono font-bold mb-1">ERROR</div>
                <div className="text-silver text-sm">{errorMsg}</div>
              </div>
            )}

            {workoutState === 'results' && result && (
              <div className="bg-neon/5 border border-neon/30 rounded-xl px-4 py-3">
                <div className="text-neon text-xs font-mono font-bold mb-1">✓ SAVED TO MONGODB</div>
                <div className="text-silver text-sm font-mono">ID: {result.workoutId}</div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <StatsCards
              reps={result?.reps ?? null}
              accuracy={result?.accuracy ?? null}
              repScores={result?.repScores ?? []}
              frameCount={frameCount}
              isRecording={isRecording}
            />

            <div className="bg-panel border border-border rounded-2xl overflow-hidden" style={{height:'320px'}}>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="text-dim text-xs font-mono tracking-widest uppercase">3D Motion Path</div>
                <div className="text-muted text-xs font-mono">Drag to rotate</div>
              </div>
              <div className="h-[calc(100%-40px)]">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><span className="text-dim text-xs font-mono">Loading 3D…</span></div>}>
                  <BarPath3D frames={displayFrames} isRecording={isRecording} />
                </Suspense>
              </div>
            </div>

            {/* Sensor debug */}
            <div className="bg-panel border border-border rounded-2xl p-4">
              <div className="text-dim text-xs font-mono tracking-widest uppercase mb-3">Live Sensor Values</div>
              <div className="grid grid-cols-3 gap-2">
                {(['ax','ay','az','gx','gy','gz'] as const).map(axis => (
                  <div key={axis} className="bg-slate rounded-lg px-3 py-2">
                    <div className="text-muted text-xs font-mono">{axis}</div>
                    <div className={`font-mono font-bold text-sm ${
                      axis.startsWith('a') ? 'text-neon' : 'text-azure'
                    }`}>
                      {lastFrame ? lastFrame[axis].toFixed(2) : '—'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex justify-between"><span className="text-muted">Frames</span><span className="text-silver">{displayFrames.length}</span></div>
                <div className="flex justify-between"><span className="text-muted">Protocol</span><span className={isHttps ? 'text-neon' : 'text-amber'}>{isHttps ? 'HTTPS ✓' : 'HTTP ⚠'}</span></div>
                <div className="flex justify-between"><span className="text-muted">Duration</span>
                  <span className="text-silver">
                    {displayFrames.length > 1
                      ? ((displayFrames[displayFrames.length-1].time - displayFrames[0].time)/1000).toFixed(1)+'s'
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-muted">State</span>
                  <span className={workoutState === 'recording' ? 'text-crimson' : workoutState === 'results' ? 'text-neon' : 'text-dim'}>
                    {workoutState.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}