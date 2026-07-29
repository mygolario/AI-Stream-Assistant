/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0b1411',
        surface: {
          0: '#0f1a16',
          1: '#13201b',
          2: '#1a2a24',
          3: '#24352e',
        },
        border: {
          DEFAULT: '#2a3d34',
          hover: '#3a5246',
          active: '#3ecf8e',
        },
        text: {
          primary: '#f4f0e6',
          secondary: '#a8b5ad',
          tertiary: '#6f7f76',
        },
        accent: {
          blue: '#7aa2ff',
          'blue-hover': '#5b86f0',
          'blue-muted': 'rgba(122, 162, 255, 0.12)',
          'blue-subtle': 'rgba(122, 162, 255, 0.06)',
          amber: '#f0c75e',
          'amber-hover': '#d4a83c',
          'amber-muted': 'rgba(240, 199, 94, 0.12)',
          emerald: '#3ecf8e',
          'emerald-hover': '#2fb875',
          'emerald-muted': 'rgba(62, 207, 142, 0.14)',
          rose: '#f07178',
          'rose-hover': '#e0555d',
          'rose-muted': 'rgba(240, 113, 120, 0.12)',
        },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'Segoe UI', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.03em', fontWeight: '600' }],
        heading: ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.02em', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.5' }],
      },
      spacing: {
        4.5: '1.125rem',
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
        sidebar: '56px',
        'sidebar-expanded': '220px',
        header: '48px',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
        'card-hover': '0 8px 24px 0 rgba(0, 0, 0, 0.45)',
        modal: '0 16px 48px -8px rgba(0, 0, 0, 0.7)',
        command: '0 24px 64px -12px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
};
