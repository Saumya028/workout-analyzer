// src/components/ExerciseSelector.tsx
'use client';

import { EXERCISE_LIST, ExerciseKey } from '@/lib/goldenRepTemplates';

interface ExerciseSelectorProps {
  selected: ExerciseKey;
  onChange: (exercise: ExerciseKey) => void;
  disabled?: boolean;
}

export default function ExerciseSelector({
  selected,
  onChange,
  disabled = false,
}: ExerciseSelectorProps) {
  return (
    <div className="w-full">
      <label className="block text-dim text-xs font-mono tracking-widest uppercase mb-3">
        Select Exercise
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {EXERCISE_LIST.map(({ key, label, icon }) => {
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => !disabled && onChange(key)}
              disabled={disabled}
              className={`
                relative group flex flex-col items-center gap-2 p-3 rounded-xl border
                transition-all duration-200 text-left
                ${isSelected
                  ? 'border-neon bg-neon-glow shadow-neon-sm'
                  : 'border-border bg-panel hover:border-muted hover:bg-slate'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Active indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon" />
              )}

              <span className="text-2xl">{icon}</span>
              <span
                className={`text-xs font-mono text-center leading-tight ${
                  isSelected ? 'text-neon' : 'text-silver'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}