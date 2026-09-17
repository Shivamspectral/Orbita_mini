import type { Config } from 'tailwindcss'

// Tailwind is available for new/responsive work, but the existing Orbita Mini
// visual design is preserved verbatim via src/styles/legacy.css (ported 1:1
// from the original index.html <style> blocks). We do not re-theme colors
// here -- the legacy CSS custom properties (--wine, --text-main, etc.) remain
// the source of truth for the existing UI.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {}
  },
  plugins: []
} satisfies Config
