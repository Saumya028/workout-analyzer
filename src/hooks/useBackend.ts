// src/hooks/useBackend.ts
// ──────────────────────────────────────────────────────────────────────────────
// Custom hook that abstracts backend calls.
// Switches between Next.js API routes and Python FastAPI based on settings.
// ──────────────────────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect, useCallback } from 'react';

type BackendMode = 'nextjs' | 'fastapi';

interface BackendConfig {
  mode: BackendMode;
  baseUrl: string;
}

export function useBackend() {
  const [config, setConfig] = useState<BackendConfig>({
    mode: 'nextjs',
    baseUrl: '',
  });

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mode = (localStorage.getItem('formiq_backend') as BackendMode) || 'nextjs';
      const fastapiUrl = localStorage.getItem('formiq_fastapi_url') || 'http://localhost:8000';
      setConfig({
        mode,
        baseUrl: mode === 'fastapi' ? fastapiUrl : '',
      });
    }
  }, []);

  const getUrl = useCallback((path: string): string => {
    if (config.mode === 'fastapi') {
      return `${config.baseUrl}${path}`;
    }
    return path; // Next.js API routes are relative
  }, [config]);

  const postWorkout = useCallback(async (exercise: string, sensorData: unknown[]) => {
    const res = await fetch(getUrl('/api/workout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise, sensorData }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || e.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }, [getUrl]);

  const getWorkouts = useCallback(async (params?: { exercise?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.exercise) sp.set('exercise', params.exercise);
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    const url = getUrl(`/api/workout${qs ? '?' + qs : ''}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [getUrl]);

  const getExercises = useCallback(async () => {
    const res = await fetch(getUrl('/api/exercises'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [getUrl]);

  const simulate = useCallback(async (exercise: string, reps: number) => {
    const res = await fetch(getUrl(`/api/simulate?exercise=${exercise}&reps=${reps}`), {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [getUrl]);

  return { config, postWorkout, getWorkouts, getExercises, simulate };
}
