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
        'accent-gold': 'var(--accent-gold)',
        'quality-r': 'var(--quality-r)',
        'quality-sr': 'var(--quality-sr)',
        'quality-ssr': 'var(--quality-ssr)',
        'quality-ur': 'var(--quality-ur)',
      },
      borderRadius: {
        panel: 'var(--radius-panel)',
        card: 'var(--radius-card)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out forwards',
        slideUp: 'slideUp 0.25s ease-out forwards',
      },
    }
  },
  plugins: [],
}
