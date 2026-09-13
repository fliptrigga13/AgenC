/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        // Futuristic cybernetic palette (ZERO PURPLE)
        bbs: {
          black: '#040508',
          purple: '#FF7700', // No purple: Replaced with Electric Solar Orange
          'purple-dim': '#2E1504', // Rich amber obsidian border
          pink: '#FFAA33', // Golden Amber
          'pink-dim': '#3D1F06',
          orange: '#FF5500', // Molten Orange
          green: '#00F59B', // Holographic Emerald
          'green-dim': '#083D26',
          cyan: '#00E5FF', // Quantum Cyber Cyan
          magenta: '#FF8800',
          'magenta-dim': '#2E1504',
          red: '#FF3B30',
          yellow: '#FFCC00',
          white: '#F8FAFC',
          lightgray: '#CBD5E1',
          gray: '#64748B',
          dark: '#080A0F',
          surface: '#0D1017',
          border: 'rgba(255, 119, 0, 0.22)',
        },
        // Map tetsuo scale to BBS grayscale equivalents
        tetsuo: {
          50: 'rgb(var(--tetsuo-50) / <alpha-value>)',
          100: 'rgb(var(--tetsuo-100) / <alpha-value>)',
          200: 'rgb(var(--tetsuo-200) / <alpha-value>)',
          300: 'rgb(var(--tetsuo-300) / <alpha-value>)',
          400: 'rgb(var(--tetsuo-400) / <alpha-value>)',
          500: 'rgb(var(--tetsuo-500) / <alpha-value>)',
          600: 'rgb(var(--tetsuo-600) / <alpha-value>)',
          700: 'rgb(var(--tetsuo-700) / <alpha-value>)',
          800: 'rgb(var(--tetsuo-800) / <alpha-value>)',
          900: 'rgb(var(--tetsuo-900) / <alpha-value>)',
          950: 'rgb(var(--tetsuo-950) / <alpha-value>)',
        },
        accent: {
          DEFAULT: '#FF7700',
          light: '#FF9933',
          dark: '#E65500',
          bg: 'rgba(255, 119, 0, 0.14)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        heading: ['Outfit', '"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
