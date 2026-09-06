// eslint-config-next 16 отдаёт готовый flat-config массив, поэтому FlatCompat
// здесь не нужен (и на ESLint 10 он уже не работает: eslintrc-мост удалён).
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
]

export default config
