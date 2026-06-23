/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Commit Mono"', '"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg: '#F7F6F4',
        surface: '#FFFFFF',
        'text-primary': '#18181B',
        'text-muted': '#A1A1AA',
        border: '#E4E4E7',
        signal: '#F7931A',
        'signal-low': 'rgba(247,147,26,0.15)',
        'signal-mid': 'rgba(247,147,26,0.70)',
      },
    },
  },
  plugins: [],
}
