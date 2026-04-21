// src/app/components/Navbar.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Responsive navbar with 6-page navigation, mobile hamburger, active state.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',          label: 'Home',            icon: '🏠' },
  { href: '/workout',   label: 'Live Workout',    icon: '⚡' },
  { href: '/calibrate', label: 'Calibrate',       icon: '🎯' },
  { href: '/analytics', label: 'Rep Analytics',   icon: '📊' },
  { href: '/viewer',    label: '3D Motion',       icon: '🧊' },
  { href: '/exercises', label: 'Exercise Library', icon: '📚' },
  { href: '/settings',  label: 'Settings',        icon: '⚙️' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen
          ? 'bg-carbon/95 backdrop-blur-xl border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between">
          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-lg bg-neon opacity-20 animate-pulse-neon" />
              <div className="absolute inset-0.5 rounded-md bg-obsidian flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path
                    d="M12 2L4 7v10l8 5 8-5V7L12 2z"
                    stroke="#00FFB2"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M12 2v20M4 7l8 5 8-5" stroke="#00FFB2" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
            <div>
              <span className="text-white font-display text-lg font-bold tracking-tight">
                FORM<span className="text-neon">IQ</span>
              </span>
              <div className="text-dim text-[10px] font-mono tracking-widest leading-none">
                MOTION ANALYSIS
              </div>
            </div>
          </Link>

          {/* ── Desktop Nav Links ────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon }) => {
              const isActive = pathname === href ||
                (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 group ${
                    isActive
                      ? 'text-neon bg-neon/10'
                      : 'text-ghost hover:text-white hover:bg-slate/50'
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  <span>{label}</span>
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon animate-pulse-neon" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Status + Mobile Toggle ───────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* System status */}
            <div className="hidden sm:flex items-center gap-2 bg-panel border border-border rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon" />
              <span className="text-dim text-xs font-mono tracking-wide">READY</span>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-slate/50 transition-colors"
              aria-label="Toggle menu"
            >
              <span className={`w-5 h-0.5 bg-silver rounded-full transition-all duration-300 ${
                mobileOpen ? 'rotate-45 translate-y-2' : ''
              }`} />
              <span className={`w-5 h-0.5 bg-silver rounded-full transition-all duration-300 ${
                mobileOpen ? 'opacity-0' : ''
              }`} />
              <span className={`w-5 h-0.5 bg-silver rounded-full transition-all duration-300 ${
                mobileOpen ? '-rotate-45 -translate-y-2' : ''
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu ──────────────────────────────────────────────────── */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${
        mobileOpen ? 'max-h-96 border-t border-border' : 'max-h-0'
      }`}>
        <div className="px-4 py-3 space-y-1 bg-carbon/95 backdrop-blur-xl">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive = pathname === href ||
              (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-neon bg-neon/10 border border-neon/20'
                    : 'text-ghost hover:text-white hover:bg-slate/50'
                }`}
              >
                <span className="text-lg">{icon}</span>
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}