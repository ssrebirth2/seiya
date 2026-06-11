/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        panel: 'var(--panel)',
        'panel-solid': 'var(--panel-solid)',
        'panel-border': 'var(--panel-border)',
        'panel-hover': 'var(--panel-hover)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-fg': 'var(--accent-fg)',
        'accent-subtle': 'var(--accent-subtle)',
        'accent-border': 'var(--accent-border)',
        destructive: 'var(--destructive)',
        'destructive-hover': 'var(--destructive-hover)',
        'destructive-fg': 'var(--destructive-fg)',
        'icon-hero': 'var(--icon-hero)',
        'icon-artifact': 'var(--icon-artifact)',
        'icon-force': 'var(--icon-force)',
        'icon-tool': 'var(--icon-tool)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out forwards',
      },
    }
  },
  plugins: [],
}
