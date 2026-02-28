/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        hw: {
          50:  '#faf6f0',
          100: '#f0e8d8',
          200: '#e0d4be',
          300: '#d0c4a8',
          400: '#b0a080',
          500: '#8a7a60',
          600: '#6a5a40',
          700: '#4a3a28',
          800: '#3a2a18',
          900: '#2a1a08',
        },
        metal: {
          100: '#e8e4de',
          200: '#d0ccc4',
          300: '#b8b4ac',
          400: '#a09c94',
          500: '#88847c',
        },
        vu: {
          bg:    '#2a2218',
          amber: '#f5a623',
          red:   '#e53e3e',
          green: '#48bb78',
        },
        tape: {
          shell:  '#3a3632',
          reel:   '#1a1816',
          tape:   '#2c1810',
          label:  '#f0e8d0',
        },
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
        label: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'inset-groove': 'inset 0 2px 4px rgba(20,15,5,0.45), inset 0 -1px 2px rgba(255,250,240,0.1)',
        'knob': '0 2px 6px rgba(20,15,5,0.5), 0 1px 2px rgba(20,15,5,0.3), 0 6px 16px rgba(20,15,5,0.15)',
        'knob-sm': '0 1px 4px rgba(20,15,5,0.5), 0 1px 1px rgba(20,15,5,0.3), 0 4px 10px rgba(20,15,5,0.12)',
        'fader-slot': 'inset 0 2px 8px rgba(20,15,5,0.6), inset 0 -1px 1px rgba(255,250,240,0.06)',
        'fader-thumb': '0 1px 3px rgba(20,15,5,0.6), 0 4px 8px rgba(20,15,5,0.12), inset 0 1px 0 rgba(255,250,240,0.18)',
        'button-up': '0 3px 6px rgba(20,15,5,0.4), 0 6px 14px rgba(20,15,5,0.12), inset 0 1px 0 rgba(255,250,240,0.22)',
        'button-down': 'inset 0 2px 4px rgba(20,15,5,0.45)',
        'device': '0 8px 30px rgba(20,15,5,0.5), 0 2px 8px rgba(20,15,5,0.3)',
        'vu-recess': 'inset 0 3px 8px rgba(20,15,5,0.55), inset 0 1px 2px rgba(20,15,5,0.3), inset 0 -1px 2px rgba(255,250,240,0.08)',
        'cassette-well': 'inset 0 4px 12px rgba(20,15,5,0.6), inset 0 1px 3px rgba(20,15,5,0.3), inset 0 -2px 4px rgba(255,250,240,0.05)',
        'led-red': '0 0 6px 2px rgba(239,68,68,0.7)',
        'led-green': '0 0 6px 2px rgba(34,197,94,0.7)',
        'led-amber': '0 0 6px 2px rgba(245,166,35,0.7)',
        'led-blue': '0 0 6px 2px rgba(96,165,250,0.7)',
      },
      keyframes: {
        'reel-spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'led-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
      animation: {
        'reel-spin':  'reel-spin 2s linear infinite',
        'reel-slow':  'reel-spin 4s linear infinite',
        'led-pulse':  'led-pulse 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
