/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      /* ── Colour Palette ──────────────────────────────────────────────── */
      colors: {
        // Backgrounds
        obsidian: "#080B0F",
        carbon:   "#0C1017",
        panel:    "#111820",
        slate:    "#1A2332",

        // Text
        silver: "#C8D1DC",
        ghost:  "#94A3B8",
        dim:    "#64748B",
        muted:  "#475569",

        // Accents
        neon:    "#00FFB2",
        azure:   "#3D8EFF",
        crimson: "#FF4060",
        amber:   "#FFB830",
        purple:  "#A855F7",

        // Borders
        border: "#1E293B",
      },

      /* ── Typography ──────────────────────────────────────────────────── */
      fontFamily: {
        display: ['"Inter"', "system-ui", "sans-serif"],
        body:    ['"Inter"', "system-ui", "sans-serif"],
        mono:    ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },

      /* ── Animations ──────────────────────────────────────────────────── */
      animation: {
        "pulse-neon": "pulse-neon 2s ease-in-out infinite",
        "glow":       "glow 2s ease-in-out infinite alternate",
        "slide-up":   "slide-up 0.5s ease-out",
        "fade-in":    "fade-in 0.5s ease-out",
        "float":      "float 6s ease-in-out infinite",
        "shimmer":    "shimmer 2s linear infinite",
      },
      keyframes: {
        "pulse-neon": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        glow: {
          "0%":   { boxShadow: "0 0 5px rgba(0, 255, 178, 0.2), 0 0 20px rgba(0, 255, 178, 0.1)" },
          "100%": { boxShadow: "0 0 10px rgba(0, 255, 178, 0.4), 0 0 40px rgba(0, 255, 178, 0.2)" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },

      /* ── Shadows ─────────────────────────────────────────────────────── */
      boxShadow: {
        "neon-sm":  "0 0 10px rgba(0, 255, 178, 0.15)",
        "neon-md":  "0 0 20px rgba(0, 255, 178, 0.2)",
        "neon-lg":  "0 0 40px rgba(0, 255, 178, 0.25)",
        "azure-sm": "0 0 10px rgba(61, 142, 255, 0.15)",
        "glass":    "0 8px 32px rgba(0, 0, 0, 0.4)",
      },

      /* ── Backdrop ────────────────────────────────────────────────────── */
      backdropBlur: {
        xs: "2px",
      },

      /* ── Background Images ──────────────────────────────────────────── */
      backgroundImage: {
        "neon-glow":    "radial-gradient(ellipse at center, rgba(0,255,178,0.08) 0%, transparent 70%)",
        "azure-glow":   "radial-gradient(ellipse at center, rgba(61,142,255,0.08) 0%, transparent 70%)",
        "hero-gradient": "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,255,178,0.06) 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};
