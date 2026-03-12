// src/app/components/GoldenRepPreview.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Small canvas that draws a golden rep signal curve.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

import { useRef, useEffect } from 'react';

interface GoldenRepPreviewProps {
  signal: number[];
  color?: string;
  height?: number;
}

export default function GoldenRepPreview({
  signal,
  color = '#00FFB2',
  height = 60,
}: GoldenRepPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || signal.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height: h } = canvas;
    ctx.clearRect(0, 0, width, h);

    // Zero line
    ctx.beginPath();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(width, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Signal
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    for (let i = 0; i < signal.length; i++) {
      const x = (i / (signal.length - 1)) * width;
      const y = h / 2 - signal[i] * (h / 2 - 6);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [signal, color]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={height}
      className="w-full rounded-lg bg-obsidian/50"
      style={{ height: `${height}px` }}
    />
  );
}
