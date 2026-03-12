// src/app/components/FeatureCard.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Glassmorphism feature card for the Home page.
// ──────────────────────────────────────────────────────────────────────────────
'use client';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  accentColor?: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  accentColor = '#00FFB2',
}: FeatureCardProps) {
  return (
    <div className="glass-card-hover p-6 group relative overflow-hidden">
      {/* Glow effect */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"
        style={{ backgroundColor: accentColor + '15' }}
      />

      <div className="relative">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 border"
          style={{
            borderColor: accentColor + '30',
            backgroundColor: accentColor + '10',
          }}
        >
          {icon}
        </div>

        {/* Content */}
        <h3 className="text-lg font-display font-bold text-white mb-2">{title}</h3>
        <p className="text-ghost text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
