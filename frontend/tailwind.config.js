/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0A0A0B',
        surface: {
          0: '#111113',
          1: '#191A1E',
          2: '#222327',
          3: '#2C2D32',
        },
        border: {
          DEFAULT: '#27282D',
          hover: '#3A3B42',
          active: '#3B82F6',
        },
        text: {
          primary: '#EDEDEF',
          secondary: '#8B8D98',
          tertiary: '#5C5E6A',
        },
        accent: {
          blue: '#3B82F6',
          'blue-hover': '#2563EB',
          'blue-muted': 'rgba(59, 130, 246, 0.12)',
          'blue-subtle': 'rgba(59, 130, 246, 0.06)',
          amber: '#F59E0B',
          'amber-hover': '#D97706',
          'amber-muted': 'rgba(245, 158, 11, 0.12)',
          emerald: '#10B981',
          'emerald-hover': '#059669',
          'emerald-muted': 'rgba(16, 185, 129, 0.12)',
          rose: '#F43F5E',
          'rose-hover': '#E11D48',
          'rose-muted': 'rgba(244, 63, 94, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'heading': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.5' }],
        'mono-lg': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'mono-xl': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        'sidebar': '56px',
        'sidebar-expanded': '220px',
        'header': '48px',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.4)',
        'modal': '0 16px 48px -8px rgba(0, 0, 0, 0.7)',
        'command': '0 24px 64px -12px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'count-up': 'countUp 0.8s ease-out',
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
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },
    },
  },
  plugins: [],
}
