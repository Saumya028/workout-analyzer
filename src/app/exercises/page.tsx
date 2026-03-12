// src/app/exercises/page.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Exercise Library — Grid of supported exercises with golden rep previews.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

import { useState } from 'react';
import { ExerciseKey, goldenRepTemplates, EXERCISE_LIST } from '@/lib/goldenRepTemplates';
import GoldenRepPreview from '../components/GoldenRepPreview';

export default function ExercisesPage() {
  const [selected, setSelected] = useState<ExerciseKey | null>(null);
  const tpl = selected ? goldenRepTemplates[selected] : null;

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white">
            EXERCISE <span className="text-gradient-neon">LIBRARY</span>
          </h1>
          <p className="text-dim text-sm font-mono mt-1">
            8 supported exercises with biomechanically accurate golden rep templates
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Exercise Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXERCISE_LIST.map(({ key, label, icon }) => {
              const t = goldenRepTemplates[key];
              const isSelected = selected === key;

              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={`glass-card-hover p-5 text-left relative overflow-hidden group transition-all duration-300 ${
                    isSelected ? 'ring-1 ring-neon/40 shadow-neon-sm' : ''
                  }`}
                >
                  {/* Glow */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-neon/5 pointer-events-none" />
                  )}

                  <div className="relative flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 ${
                      isSelected ? 'bg-neon/15' : 'bg-panel'
                    }`}>
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-display font-bold ${
                          isSelected ? 'text-neon' : 'text-white'
                        }`}>
                          {label}
                        </h3>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon" />
                        )}
                      </div>

                      <p className="text-ghost text-xs leading-relaxed mb-2 line-clamp-2">
                        {t.description}
                      </p>

                      <div className="flex gap-3 text-xs font-mono text-dim">
                        <span>Axis: <span className={isSelected ? 'text-neon' : 'text-silver'}>{t.primaryAxis.toUpperCase()}</span></span>
                        <span>{(t.expectedDurationMs[0]/1000).toFixed(1)}–{(t.expectedDurationMs[1]/1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail Panel */}
          <div className="space-y-5">
            {tpl && selected ? (
              <>
                <div className="glass-card p-5">
                  <div className="text-3xl mb-3">
                    {EXERCISE_LIST.find(e => e.key === selected)?.icon}
                  </div>
                  <h2 className="text-2xl font-display font-bold text-white mb-2">
                    {tpl.name}
                  </h2>
                  <p className="text-ghost text-sm leading-relaxed mb-4">
                    {tpl.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Primary Axis', value: tpl.primaryAxis.toUpperCase() },
                      { label: 'Peak Threshold', value: String(tpl.peakThreshold) },
                      { label: 'Min Duration', value: `${(tpl.expectedDurationMs[0]/1000).toFixed(1)}s` },
                      { label: 'Max Duration', value: `${(tpl.expectedDurationMs[1]/1000).toFixed(1)}s` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-obsidian/50 rounded-lg px-3 py-2">
                        <div className="text-dim text-xs font-mono">{label}</div>
                        <div className="text-neon font-mono font-bold">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="section-label mb-3">Golden Rep Signal</div>
                  <GoldenRepPreview signal={tpl.signal} height={100} />
                  <p className="text-dim text-xs font-mono mt-2 text-center">
                    60-point normalized trajectory (−1 to +1)
                  </p>
                </div>
              </>
            ) : (
              <div className="glass-card p-10 text-center">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-white font-display font-bold text-lg mb-2">
                  Select an Exercise
                </h3>
                <p className="text-ghost text-sm">
                  Click any exercise to view its golden rep template, parameters, and signal profile.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
