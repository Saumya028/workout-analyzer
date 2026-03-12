// src/app/components/RepChart.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Recharts bar chart showing per-rep accuracy scores with color coding.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

interface RepChartProps {
  repScores: number[];
}

function getColor(score: number): string {
  if (score >= 80) return '#00FFB2';
  if (score >= 60) return '#FFB830';
  return '#FF4060';
}

export default function RepChart({ repScores }: RepChartProps) {
  const data = repScores.map((score, i) => ({
    name: `Rep ${i + 1}`,
    score,
  }));

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-dim text-sm font-mono">
        No rep data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#1E293B' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#1E293B' }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111820',
            border: '1px solid #1E293B',
            borderRadius: '8px',
            fontFamily: 'JetBrains Mono',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#C8D1DC' }}
          itemStyle={{ color: '#00FFB2' }}
          formatter={(value?: number | string) => [`${value}%`, 'Accuracy']}
        />
        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getColor(entry.score)} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
