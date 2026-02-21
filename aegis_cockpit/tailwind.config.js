/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'aegis-bg': '#0a0e17',
        'aegis-panel': '#111827',
        'aegis-border': '#1f2937',
        'aegis-accent': '#00ff88',
        'aegis-warn': '#ff6b35',
        'aegis-danger': '#ef4444',
        'aegis-blue': '#3b82f6',
        'aegis-purple': '#8b5cf6',
        'aegis-cyan': '#06b6d4',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan-line': 'scanLine 4s linear infinite',
        'typing': 'typing 0.05s steps(1)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 5px rgba(0, 255, 136, 0.3)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 20px rgba(0, 255, 136, 0.6)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
