/** @type {import('tailwindcss').Config} */
const ch = (n) => `rgb(var(--slate-${n}) / <alpha-value>)`;
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: 'var(--brand, #0f766e)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        slate: { 50: ch(50), 100: ch(100), 200: ch(200), 300: ch(300), 400: ch(400), 500: ch(500), 600: ch(600), 700: ch(700), 800: ch(800), 900: ch(900) },
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.05), 0 8px 24px -12px rgb(15 23 42 / 0.12)',
        lift: '0 2px 4px rgb(15 23 42 / 0.06), 0 16px 32px -14px rgb(15 23 42 / 0.25)',
      },
    },
  },
  plugins: [],
};
