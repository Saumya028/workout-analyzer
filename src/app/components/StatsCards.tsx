// src/components/StatsCards.tsx
'use client';

import { useEffect, useRef } from 'react';

interface StatsCardsProps {
  reps: number | null;
  accuracy: number | null;
  repScores: number[];
  frameCount: number;
  isRecording: boolean;
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!ref.current || value === prevRef.current) return;
    const start = prevRef.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      if (ref.current) ref.current.textContent = String(current);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    prevRef.current = end;
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

function AccuracyRing({ value }: { value: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = value / 100;
  const dashoffset = circumference * (1 - progress);

  const color =
    value >= 80 ? '#00FFB2' : value >= 60 ? '#FFB830' : '#FF4060';

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
      {/* Background ring */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#2A3441"
        strokeWidth="8"
      />
      {/* Progress ring */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
      />
      {/* Glow layer */}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        opacity="0.3"
        style={{ filter: 'blur(3px)', transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

export default function StatsCards({
  reps,
  accuracy,
  repScores,
  frameCount,
  isRecording,
}: StatsCardsProps) {
  const accuracyColor =
    accuracy === null
      ? 'text-dim'
      : accuracy >= 80
      ? 'text-neon'
      : accuracy >= 60
      ? 'text-amber'
      : 'text-crimson';

  const accuracyLabel =
    accuracy === null
      ? '—'
      : accuracy >= 80
      ? 'EXCELLENT'
      : accuracy >= 60
      ? 'GOOD'
      : 'NEEDS WORK';

  return (
    <div className="w-full space-y-4">
      {/* Primary stats row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Rep Count */}
        <div className="bg-panel border border-border rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-transparent" />
          <div className="relative">
            <div className="text-dim text-xs font-mono tracking-widest uppercase mb-2">
              Reps
            </div>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-display font-bold text-white tabular-nums">
                {reps !== null ? (
                  <AnimatedNumber value={reps} />
                ) : (
                  <span className="text-muted">—</span>
                )}
              </span>
              {reps !== null && (
                <span className="text-dim text-sm font-mono mb-2">reps</span>
              )}
            </div>

            {/* Rep score mini bars */}
            {repScores.length > 0 && (
              <div className="mt-3 flex gap-1 items-end h-6">
                {repScores.slice(-12).map((score, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${Math.max(20, score)}%`,
                      backgroundColor:
                        score >= 80 ? '#00FFB2' : score >= 60 ? '#FFB830' : '#FF4060',
                      opacity: 0.8,
                      transition: 'height 0.3s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-panel border border-border rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-azure/5 to-transparent" />
          <div className="relative">
            <div className="text-dim text-xs font-mono tracking-widest uppercase mb-1">
              Accuracy
            </div>

            {accuracy !== null ? (
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <AccuracyRing value={accuracy} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xl font-display font-bold ${accuracyColor}`}>
                      <AnimatedNumber value={accuracy} />
                      <span className="text-sm">%</span>
                    </span>
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-mono font-bold ${accuracyColor}`}>
                    {accuracyLabel}
                  </div>
                  <div className="text-dim text-xs mt-1">vs golden rep</div>
                </div>
              </div>
            ) : (
              <div className="text-5xl font-display font-bold text-muted mt-1">—</div>
            )}
          </div>
        </div>
      </div>

      {/* Live recording indicator */}
      {isRecording && (
        <div className="bg-panel border border-neon/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-crimson animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-crimson opacity-30 animate-ping" />
            </div>
            <span className="text-silver text-sm font-mono">RECORDING</span>
          </div>
          <div className="flex items-center gap-2 text-dim text-xs font-mono">
            <span>{frameCount}</span>
            <span>frames captured</span>
          </div>
        </div>
      )}

      {/* Per-rep breakdown */}
      {repScores.length > 0 && (
        <div className="bg-panel border border-border rounded-2xl p-4">
          <div className="text-dim text-xs font-mono tracking-widest uppercase mb-3">
            Rep Breakdown
          </div>
          <div className="space-y-2">
            {repScores.map((score, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-muted text-xs font-mono w-12">
                  Rep {i + 1}
                </span>
                <div className="flex-1 h-2 bg-slate rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${score}%`,
                      backgroundColor:
                        score >= 80 ? '#00FFB2' : score >= 60 ? '#FFB830' : '#FF4060',
                    }}
                  />
                </div>
                <span
                  className={`text-xs font-mono w-10 text-right ${
                    score >= 80
                      ? 'text-neon'
                      : score >= 60
                      ? 'text-amber'
                      : 'text-crimson'
                  }`}
                >
                  {score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}