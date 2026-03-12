// src/app/page.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Home page — Hero section + feature cards + CTA
// ──────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import FeatureCard from './components/FeatureCard';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Real-Time Tracking',
    description:
      'Capture 6-axis motion data from your phone sensors at 50Hz. Every micro-movement is recorded for precise form analysis.',
    accentColor: '#00FFB2',
  },
  {
    icon: '🎯',
    title: 'Rep Accuracy Analysis',
    description:
      'Dynamic Time Warping compares each rep against biomechanically perfect "Golden Rep" templates. Get a 0-100% accuracy score.',
    accentColor: '#3D8EFF',
  },
  {
    icon: '🧊',
    title: '3D Motion Visualization',
    description:
      'Watch your movement path rendered in real-time 3D. Compare your trajectory against the golden rep overlay.',
    accentColor: '#A855F7',
  },
];

const STATS = [
  { value: '8', label: 'Exercises', icon: '🏋️' },
  { value: '6-Axis', label: 'Sensor Data', icon: '📡' },
  { value: 'DTW', label: 'AI Scoring', icon: '🧠' },
  { value: '3D', label: 'Visualization', icon: '🧊' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-obsidian relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-16">
        <div className="text-center animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-panel border border-border rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon" />
            <span className="text-dim text-xs font-mono tracking-wider">AI-POWERED MOTION ANALYSIS</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight text-white mb-6 leading-[1.1]">
            Track Every Rep{' '}
            <br className="hidden sm:block" />
            <span className="text-gradient-neon">Like a Pro.</span>
          </h1>

          {/* Subheading */}
          <p className="text-ghost text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time rep counting, movement accuracy tracking,
            and 3D bar path visualization — powered by your phone&apos;s motion sensors.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/workout" className="btn-neon-filled text-base px-8 py-4 rounded-2xl">
              ⚡ Start Workout
            </Link>
            <Link href="/exercises" className="btn-neon text-base px-8 py-4 rounded-2xl">
              📚 View Exercises
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map(({ value, label, icon }) => (
              <div key={label} className="glass-card p-4 text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-white font-display font-bold text-xl">{value}</div>
                <div className="text-dim text-xs font-mono tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">
            Precision Workout Intelligence
          </h2>
          <p className="text-ghost text-lg max-w-xl mx-auto">
            Three pillars of smart workout tracking, working together.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Select Exercise', desc: 'Choose from 8 supported exercises', icon: '🎯' },
            { step: '02', title: 'Record Motion', desc: 'Phone sensors capture 6-axis data', icon: '📱' },
            { step: '03', title: 'AI Analysis', desc: 'DTW compares each rep to golden template', icon: '🧠' },
            { step: '04', title: 'Get Results', desc: 'Rep count, accuracy score, 3D path', icon: '📊' },
          ].map(({ step, title, desc, icon }) => (
            <div key={step} className="glass-card p-6 text-center relative group">
              <div className="text-neon/30 text-5xl font-display font-black absolute top-3 right-4">{step}</div>
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="text-white font-display font-bold mb-1">{title}</h3>
              <p className="text-ghost text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="glass-card neon-border p-10 sm:p-16">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Ready to Analyze Your Form?
          </h2>
          <p className="text-ghost text-lg mb-8 max-w-lg mx-auto">
            Start a workout session and see how your reps compare to perfect form.
          </p>
          <Link href="/workout" className="btn-neon-filled text-lg px-10 py-4 rounded-2xl">
            🚀 Launch Workout
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-dim text-xs font-mono tracking-wider">
          FORMIQ v1.0 — AI MOTION ANALYSIS
        </p>
      </footer>
    </div>
  );
}
