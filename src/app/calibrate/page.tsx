// src/app/calibrate/page.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Golden Rep Calibration — record your best reps to create a personal template.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ExerciseSelector from '../components/ExerciseSelector';
import { ExerciseKey, goldenRepTemplates } from '@/lib/goldenRepTemplates';
import { SensorService, SensorFrame, sensorService } from '@/lib/sensorService';

type CalState = 'idle' | 'recording' | 'processing' | 'done' | 'error';
type BackendMode = 'nextjs' | 'fastapi';

interface CalibrationResult {
  success: boolean;
  message: string;
  repsDetected: number;
  repsUsed: number;
  repScores: number[];
  avgScore: number;
}

function getApiUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const mode = (localStorage.getItem('formiq_backend') as BackendMode) || 'nextjs';
  const fastapiUrl = localStorage.getItem('formiq_fastapi_url') || 'http://localhost:8000';
  return mode === 'fastapi' ? `${fastapiUrl}${path}` : path;
}

export default function CalibratePage() {
  const [exercise, setExercise] = useState<ExerciseKey>('squats');
  const [state, setState] = useState<CalState>('idle');
  const [frameCount, setFrameCount] = useState(0);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isHttps, setIsHttps] = useState(false);
  const [calibrations, setCalibrations] = useState<Record<string, { avgScore: number; createdAt: string }>>({});
  const [recordingSecs, setRecordingSecs] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsHttps(
      typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    );
    loadCalibrations();
  }, []);

  const loadCalibrations = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/calibrate'));
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, { avgScore: number; createdAt: string }> = {};
        for (const c of data.calibrations || []) {
          map[c.exercise] = { avgScore: c.avgScore, createdAt: c.createdAt };
        }
        setCalibrations(map);
      }
    } catch { /* ignore if backend not running */ }
  }, []);

  const handleStart = useCallback(async () => {
    setResult(null); setErrorMsg(''); setFrameCount(0); setRecordingSecs(0);
    setState('recording');

    const ok = await sensorService.requestPermissionAndStart(
      () => setFrameCount(sensorService.getFrameCount()),
      (err) => { setErrorMsg(err); setState('error'); }
    );
    if (!ok) return;

    // Timer for recording duration display
    timerRef.current = setInterval(() => {
      setRecordingSecs(prev => prev + 1);
    }, 1000);
  }, []);

  const handleTestRecord = useCallback(async () => {
    setResult(null); setErrorMsg('');
    setState('processing');

    const testFrames = SensorService.generateTestData(exercise, 1);
    try {
      const res = await fetch(getApiUrl('/api/calibrate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise, sensorData: testFrames }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setState(data.success ? 'done' : 'error');
      if (data.success) loadCalibrations();
    } catch (err) {
      setErrorMsg('Calibration failed: ' + (err instanceof Error ? err.message : String(err)));
      setState('error');
    }
  }, [exercise, loadCalibrations]);

  const handleStop = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const captured = sensorService.stop();
    setState('processing');

    if (captured.length < 10) {
      setErrorMsg('Not enough data — perform one full rep before stopping.');
      setState('error');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/calibrate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise, sensorData: captured }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setState(data.success ? 'done' : 'error');
      if (!data.success) setErrorMsg(data.message);
      if (data.success) loadCalibrations();
    } catch (err) {
      setErrorMsg('Calibration failed: ' + (err instanceof Error ? err.message : String(err)));
      setState('error');
    }
  }, [exercise, loadCalibrations]);

  const handleDelete = useCallback(async (ex: string) => {
    try {
      await fetch(getApiUrl(`/api/calibrate/${ex}`), { method: 'DELETE' });
      loadCalibrations();
    } catch { /* ignore */ }
  }, [loadCalibrations]);

  const handleReset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (sensorService.getIsRecording()) sensorService.stop();
    setResult(null); setErrorMsg(''); setFrameCount(0); setRecordingSecs(0);
    setState('idle');
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (sensorService.getIsRecording()) sensorService.stop();
  }, []);

  const tpl = goldenRepTemplates[exercise];
  const hasCal = !!calibrations[exercise];

  return (
    <div className="min-h-screen bg-obsidian pt-16">
      <div className="fixed inset-0 pointer-events-none"
        style={{background:'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(168,85,247,0.04) 0%, transparent 70%)'}} />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-white">
            GOLDEN REP <span className="text-purple">CALIBRATION</span>
          </h1>
          <p className="text-dim text-sm font-mono mt-1">
            Record one perfect rep to create your personal golden template
          </p>
        </div>

        <div className="space-y-5">
          {/* Exercise selector */}
          <div className="bg-panel border border-border rounded-2xl p-5">
            <ExerciseSelector
              selected={exercise}
              onChange={setExercise}
              disabled={state === 'recording' || state === 'processing'}
            />
          </div>

          {/* Exercise info + calibration status */}
          <div className="bg-panel border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-display font-bold text-white">{tpl.name}</div>
                <div className="text-ghost text-sm mt-1">{tpl.description}</div>
              </div>
              {hasCal ? (
                <div className="text-right shrink-0">
                  <div className="text-neon text-xs font-mono font-bold">CALIBRATED</div>
                  <div className="text-silver text-sm font-mono">{calibrations[exercise].avgScore}%</div>
                  <button
                    onClick={() => handleDelete(exercise)}
                    className="text-crimson/60 text-xs font-mono hover:text-crimson mt-1"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <div className="text-right shrink-0">
                  <div className="text-muted text-xs font-mono">NOT CALIBRATED</div>
                  <div className="text-dim text-xs font-mono mt-1">Using default template</div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-panel border border-border rounded-2xl p-5">
            <div className="text-dim text-xs font-mono tracking-widest uppercase mb-3">How to Calibrate</div>
            <div className="space-y-2 text-sm text-ghost">
              <div className="flex gap-3">
                <span className="text-purple font-mono font-bold">1.</span>
                <span>Select the exercise you want to calibrate</span>
              </div>
              <div className="flex gap-3">
                <span className="text-purple font-mono font-bold">2.</span>
                <span>Press <strong className="text-white">Start Recording</strong> and perform exactly <strong className="text-neon">1 perfect rep</strong> with your best form</span>
              </div>
              <div className="flex gap-3">
                <span className="text-purple font-mono font-bold">3.</span>
                <span>Press <strong className="text-white">Stop</strong> immediately after completing the single rep</span>
              </div>
              <div className="flex gap-3">
                <span className="text-purple font-mono font-bold">4.</span>
                <span>Future workouts will count and score every rep against <strong className="text-purple">your</strong> recorded golden rep</span>
              </div>
            </div>
            <div className="mt-3 bg-purple/5 border border-purple/20 rounded-lg px-3 py-2">
              <div className="text-purple text-xs font-mono">TIP: Record only 1 rep so the system knows exactly what one good rep looks like. This makes rep counting and accuracy scoring much more reliable.</div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-panel border border-border rounded-2xl p-5">
            {state === 'idle' && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleStart}
                  disabled={!isHttps}
                  className={`h-14 rounded-xl font-mono font-bold text-sm tracking-widest uppercase border transition-all active:scale-95
                    ${isHttps
                      ? 'border-purple text-purple hover:bg-purple/10'
                      : 'border-border text-muted cursor-not-allowed opacity-50'}`}
                >
                  {isHttps ? 'START RECORDING' : 'NEEDS HTTPS'}
                </button>
                <button
                  onClick={handleTestRecord}
                  className="h-10 rounded-lg border border-purple/40 text-purple/80 text-xs font-mono tracking-widest uppercase hover:border-purple hover:text-purple hover:bg-purple/5 transition-all active:scale-95"
                >
                  TEST CALIBRATION (simulated)
                </button>
              </div>
            )}

            {state === 'recording' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-crimson animate-pulse" />
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-crimson opacity-30 animate-ping" />
                    </div>
                    <span className="text-crimson text-sm font-mono font-bold">RECORDING</span>
                  </div>
                  <div className="text-silver font-mono text-sm">
                    {recordingSecs}s &bull; {frameCount} frames
                  </div>
                </div>
                <div className="text-ghost text-sm text-center">
                  Perform <strong className="text-neon">1 perfect rep</strong>, then press Stop.
                </div>
                <button
                  onClick={handleStop}
                  className="w-full h-14 rounded-xl font-mono font-bold text-sm tracking-widest uppercase border border-crimson text-crimson hover:bg-crimson/10 transition-all active:scale-95"
                >
                  STOP &amp; CALIBRATE
                </button>
              </div>
            )}

            {state === 'processing' && (
              <div className="h-14 rounded-xl border border-amber/50 flex items-center justify-center gap-3">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber animate-bounce"
                    style={{animationDelay:`${i*0.15}s`}} />
                ))}
                <span className="text-amber text-xs font-mono tracking-widest">PROCESSING...</span>
              </div>
            )}

            {state === 'done' && result && (
              <div className="space-y-4">
                <div className="bg-neon/5 border border-neon/30 rounded-xl px-4 py-3">
                  <div className="text-neon text-xs font-mono font-bold mb-2">GOLDEN REP SAVED</div>
                  <div className="text-silver text-sm">{result.message}</div>
                </div>

                <div className="bg-slate/30 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm font-medium">Your golden rep is now the reference</div>
                    <div className="text-dim text-xs font-mono mt-1">All future {tpl.name} reps will be compared against this recording</div>
                  </div>
                  <div className="text-neon font-mono font-bold text-2xl">100%</div>
                </div>

                <button onClick={handleReset}
                  className="w-full h-10 rounded-lg border border-border text-dim text-xs font-mono tracking-widest uppercase hover:border-muted hover:text-ghost transition-all active:scale-95">
                  DONE
                </button>
              </div>
            )}

            {state === 'error' && (
              <div className="space-y-3">
                <div className="bg-crimson/10 border border-crimson/50 rounded-xl px-4 py-3">
                  <div className="text-crimson text-xs font-mono font-bold mb-1">ERROR</div>
                  <div className="text-silver text-sm">{errorMsg || result?.message}</div>
                </div>
                <button onClick={handleReset}
                  className="w-full h-10 rounded-lg border border-border text-dim text-xs font-mono tracking-widest uppercase hover:border-muted hover:text-ghost transition-all active:scale-95">
                  TRY AGAIN
                </button>
              </div>
            )}
          </div>

          {/* Existing calibrations */}
          {Object.keys(calibrations).length > 0 && (
            <div className="bg-panel border border-border rounded-2xl p-5">
              <div className="text-dim text-xs font-mono tracking-widest uppercase mb-3">Your Calibrations</div>
              <div className="space-y-2">
                {Object.entries(calibrations).map(([ex, cal]) => {
                  const t = goldenRepTemplates[ex as ExerciseKey];
                  return (
                    <div key={ex} className="flex items-center justify-between py-2 px-3 bg-slate/30 rounded-lg">
                      <div>
                        <span className="text-white text-sm font-medium">{t?.name ?? ex}</span>
                        <span className="text-dim text-xs font-mono ml-2">{cal.avgScore}%</span>
                      </div>
                      <button
                        onClick={() => handleDelete(ex)}
                        className="text-crimson/50 text-xs font-mono hover:text-crimson transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
