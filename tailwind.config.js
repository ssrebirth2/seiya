/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        panel: 'var(--panel)',
        'panel-border': 'var(--panel-border)',
        'panel-hover': 'var(--panel-hover)',
        'text-muted': 'var(--text-muted)',
      }
    }
  },
  plugins: [],
}
