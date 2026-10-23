import plugin from 'tailwindcss/plugin.js'

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'hero-enter': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { 'hero-enter': 'hero-enter 500ms cubic-bezier(.16,1,.3,1) both' },
      colors: {
        // Ссылаемся на CSS-переменные, а не на хексы: одна и та же утилита
        // (bg-bg, text-fg) работает в обеих темах без dark:-дублей.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-onest)', 'system-ui', 'sans-serif'],
        // Служебный слой: шапка и подписи поверх иллюстрации.
        ui: ['var(--font-manrope)', 'var(--font-onest)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        page: '1400px',
        prose: '65ch',
      },
    },
  },
  plugins: [plugin(({ addBase }) => {
    addBase({
      ':root': {
        '--bg': '250 250 249', '--surface': '244 244 242', '--fg': '24 24 27',
        '--muted': '113 113 122', '--line': '228 228 231', '--accent': '47 107 51',
        '--accent-fg': '255 255 255', '--good': '21 127 61', '--warning': '138 90 0', '--danger': '179 38 30',
      },
      '@media (prefers-color-scheme: dark)': { ':root': {
        '--bg': '12 12 13', '--surface': '24 24 26', '--fg': '250 250 250',
        '--muted': '161 161 170', '--line': '39 39 42', '--accent': '143 190 68',
        '--accent-fg': '24 24 27', '--good': '92 201 138', '--warning': '224 166 60', '--danger': '242 132 107',
      } },
      html: { '-webkit-font-smoothing': 'antialiased', scrollBehavior: 'smooth' },
      body: { background: 'rgb(var(--bg))', color: 'rgb(var(--fg))' },
      '::selection': { background: 'rgb(var(--accent))', color: 'rgb(var(--accent-fg))' },
      ':focus-visible': { outline: '2px solid rgb(var(--accent))', outlineOffset: '3px' },
      '@media (prefers-reduced-motion: reduce)': { html: { scrollBehavior: 'auto' } },
    })
  })],
}

export default config
