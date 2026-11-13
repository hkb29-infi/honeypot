/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: '#230C0F',
        panel: '#2E1A1D',
        line: '#4F6272',
        paprika: {
          DEFAULT: '#D36135',
          soft: '#EF8B64',
        },
        pollen: '#FCCA46',
        slate: '#5C6D70',
        paper: '#FFF4E8',
        secondary: '#D7DCDA',
        muted: '#B8C2C2',
        subtle: '#9FAFB4',
      },
      boxShadow: {
        glow: '0 0 28px rgba(211, 97, 53, 0.10)',
      },
    },
  },
  plugins: [],
}
