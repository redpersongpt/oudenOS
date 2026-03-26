import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#FF5549',
          500: '#E8453C',
          600: '#CC3B33',
        },
        surface: {
          DEFAULT: '#0a0a0f',
          raised: '#131318',
          overlay: '#1a1a22',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [typography],
} satisfies Config
