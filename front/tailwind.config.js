/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lav: '#C4B5FD',
        'lav-dark': '#A78BFA',
        'lav-bg': '#EDE9FE',
        ink: '#0D0D0D',
        muted: '#9CA3AF',
        surface: '#F9F9F9',
      },
      fontFamily: {
        sans: ['"Onest"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

