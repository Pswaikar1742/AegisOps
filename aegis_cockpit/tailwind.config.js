/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'aegis-bg': '#0D1A2F',
        'aegis-panel': '#17364F',
        'aegis-accent': '#09D8C7',
        'aegis-purple': '#411E3A',
        'aegis-danger': '#DB0927',
        'aegis-danger-dark': '#500A1F',
      },
      fontFamily: {
        sans: ['"Outfit"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan-line': 'scanLine 4s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delay': 'float 8s ease-in-out 2s infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 5px rgba(9, 216, 199, 0.3)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 25px rgba(9, 216, 199, 0.6)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(9, 216, 199, 0.4), 0 0 45px rgba(9, 216, 199, 0.15)',
        'glow-red': '0 0 15px rgba(219, 9, 39, 0.4), 0 0 45px rgba(219, 9, 39, 0.15)',
        'glow-purple': '0 0 15px rgba(65, 30, 58, 0.4), 0 0 45px rgba(65, 30, 58, 0.15)',
      },
    },
  },
  plugins: [],
};
