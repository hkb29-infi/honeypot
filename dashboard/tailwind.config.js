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
        ink: '#080c14',
        panel: '#0e1420',
        window: '#0b111c',
        line: '#202a3a',
        cyan: '#62e6e0',
        acid: '#c9f47b',
      },
      boxShadow: {
        glow: '0 0 28px rgba(98, 230, 224, 0.12)',
        window: '0 32px 90px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(98, 230, 224, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
}
