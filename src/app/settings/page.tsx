// src/app/settings/page.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Settings page — Backend config, sensor preferences, about section.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

type BackendMode = 'nextjs' | 'fastapi';

export default function SettingsPage() {
  const [backendMode, setBackendMode] = useState<BackendMode>('nextjs');
  const [fastapiUrl, setFastapiUrl] = useState('http://localhost:8000');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check API status
  useEffect(() => {
    setApiStatus('checking');
    const url = backendMode === 'nextjs' ? '/api/workout' : `${fastapiUrl}/`;
    const timer = setTimeout(() => {
      fetch(url, { method: 'GET' })
        .then(res => {
          setApiStatus(res.ok ? 'online' : 'offline');
        })
        .catch(() => setApiStatus('offline'));
    }, 500);
    return () => clearTimeout(timer);
  }, [backendMode, fastapiUrl]);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('formiq_backend', backendMode);
      localStorage.setItem('formiq_fastapi_url', fastapiUrl);
    }
  }, [backendMode, fastapiUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBackendMode((localStorage.getItem('formiq_backend') as BackendMode) || 'nextjs');
      setFastapiUrl(localStorage.getItem('formiq_fastapi_url') || 'http://localhost:8000');
    }
  }, []);

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white">
            <span className="text-gradient-neon">SETTINGS</span>
          </h1>
          <p className="text-dim text-sm font-mono mt-1">
            Configure your FormIQ experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Backend Configuration */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">🔌</span>
              <div>
                <h2 className="text-lg font-display font-bold text-white">Backend</h2>
                <p className="text-dim text-xs font-mono">Choose which API server to use</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {([
                { key: 'nextjs', label: 'Next.js API', desc: 'Built-in /api routes', icon: '▲' },
                { key: 'fastapi', label: 'Python FastAPI', desc: `External server`, icon: '🐍' },
              ] as const).map(({ key, label, desc, icon }) => (
                <button
                  key={key}
                  onClick={() => setBackendMode(key)}
                  className={`p-4 rounded-xl text-left transition-all duration-200 ${
                    backendMode === key
                      ? 'bg-neon/10 border border-neon/30'
                      : 'bg-slate/30 border border-transparent hover:border-border'
                  }`}
                >
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className={`font-bold text-sm ${backendMode === key ? 'text-neon' : 'text-white'}`}>
                    {label}
                  </div>
                  <div className="text-dim text-xs font-mono mt-0.5">{desc}</div>
                </button>
              ))}
            </div>

            {backendMode === 'fastapi' && (
              <div className="mb-4">
                <label className="text-ghost text-sm font-mono block mb-2">FastAPI URL</label>
                <input
                  type="text"
                  value={fastapiUrl}
                  onChange={e => setFastapiUrl(e.target.value)}
                  className="w-full bg-obsidian border border-border rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:border-neon/50 focus:outline-none transition-colors"
                  placeholder="http://localhost:8000"
                />
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2 bg-obsidian/50 rounded-lg px-4 py-2.5">
              <div className={`w-2 h-2 rounded-full ${
                apiStatus === 'online' ? 'bg-neon animate-pulse-neon' :
                apiStatus === 'checking' ? 'bg-amber animate-pulse' :
                'bg-crimson'
              }`} />
              <span className="text-sm font-mono text-ghost">
                {backendMode === 'nextjs' ? 'Next.js API' : 'FastAPI'}: {' '}
                <span className={
                  apiStatus === 'online' ? 'text-neon' :
                  apiStatus === 'checking' ? 'text-amber' :
                  'text-crimson'
                }>
                  {apiStatus.toUpperCase()}
                </span>
              </span>
            </div>
          </div>

          {/* Sensor Settings */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">📡</span>
              <div>
                <h2 className="text-lg font-display font-bold text-white">Sensor</h2>
                <p className="text-dim text-xs font-mono">Motion sensor configuration</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Sample Rate', value: '50 Hz', desc: 'Sensor data capture frequency' },
                { label: 'Max Buffer', value: '6000 frames', desc: 'Maximum frames before ring buffer' },
                { label: 'Smoothing Window', value: '7 points', desc: 'Moving average filter width' },
                { label: 'Min Frames', value: '10', desc: 'Minimum data for analysis' },
              ].map(({ label, value, desc }) => (
                <div key={label} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-silver text-sm">{label}</div>
                    <div className="text-dim text-xs font-mono">{desc}</div>
                  </div>
                  <div className="bg-obsidian/50 border border-border rounded-lg px-3 py-1.5 text-neon text-sm font-mono">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* About */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h2 className="text-lg font-display font-bold text-white">About</h2>
                <p className="text-dim text-xs font-mono">FormIQ version and credits</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Version', value: '1.0.0' },
                { label: 'Framework', value: 'Next.js 16 + React 19' },
                { label: 'Backend', value: 'Next.js API / FastAPI' },
                { label: 'Database', value: 'MongoDB Atlas' },
                { label: '3D Engine', value: 'React Three Fiber' },
                { label: 'AI Scoring', value: 'DTW (Dynamic Time Warping)' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-muted text-sm font-mono">{label}</span>
                  <span className="text-silver text-sm font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Run instructions */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🚀</span>
              <h2 className="text-lg font-display font-bold text-white">Quick Start</h2>
            </div>

            <div className="space-y-3 text-sm font-mono">
              <div className="bg-obsidian/50 rounded-lg p-3">
                <div className="text-neon mb-1"># Frontend</div>
                <div className="text-silver">npm run dev</div>
                <div className="text-dim text-xs mt-1">→ http://localhost:3000</div>
              </div>
              <div className="bg-obsidian/50 rounded-lg p-3">
                <div className="text-amber mb-1"># Backend (optional)</div>
                <div className="text-silver">cd backend</div>
                <div className="text-silver">pip install -r requirements.txt</div>
                <div className="text-silver">uvicorn main:app --reload --port 8000</div>
                <div className="text-dim text-xs mt-1">→ http://localhost:8000</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
