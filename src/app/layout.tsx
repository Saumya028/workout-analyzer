// src/app/layout.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Root layout — dark theme, Google Fonts integration, Navbar on all pages.
// ──────────────────────────────────────────────────────────────────────────────

import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from './components/Navbar';

export const metadata: Metadata = {
  title: 'FormIQ — AI Motion Analysis',
  description:
    'Track every rep like a pro. Real-time rep detection, accuracy scoring, and 3D motion visualization using mobile sensors.',
  manifest: '/manifest.json',
  keywords: ['workout', 'fitness', 'motion tracking', 'rep counter', 'gym', 'AI'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#080B0F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Fonts: Inter (display/body) + JetBrains Mono (code) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-obsidian text-silver font-body antialiased">
        <Navbar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}