import path from 'node:path';
import { fileURLToPath } from 'node:url';
import colors from 'tailwindcss/colors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{js,jsx,ts,tsx}'),
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: colors.white,
      black: colors.black,
      slate: colors.slate,
      indigo: colors.indigo,
      blue: colors.blue,
      teal: colors.teal,
      emerald: colors.emerald,
      amber: colors.amber,
      orange: colors.orange,
      violet: colors.violet,
      rose: colors.rose,
      red: colors.red,
      green: colors.green,
      brand: {
        indigo: colors.indigo[600],
        blue: colors.blue[600],
        teal: colors.teal[500],
      },
      phase: {
        samajhna: {
          50: colors.indigo[50],
          100: colors.indigo[100],
          200: colors.indigo[200],
          500: colors.blue[600],
          600: colors.indigo[600],
          700: colors.indigo[700],
          800: colors.indigo[800],
          900: colors.indigo[900],
        },
        karna: {
          50: colors.emerald[50],
          100: colors.emerald[100],
          200: colors.emerald[200],
          500: colors.teal[500],
          600: colors.emerald[600],
          700: colors.emerald[700],
          800: colors.emerald[800],
          900: colors.emerald[900],
        },
        peecha: {
          50: colors.amber[50],
          100: colors.amber[100],
          200: colors.amber[200],
          500: colors.orange[500],
          600: colors.amber[600],
          700: colors.amber[700],
          800: colors.amber[800],
          900: colors.amber[900],
        },
      },
      gate: {
        consent: {
          50: colors.violet[50],
          100: colors.violet[100],
          200: colors.violet[200],
          600: colors.violet[600],
          700: colors.violet[700],
          800: colors.violet[800],
          900: colors.violet[900],
        },
        change: {
          50: colors.rose[50],
          100: colors.rose[100],
          200: colors.rose[200],
          600: colors.rose[600],
          700: colors.rose[700],
          800: colors.rose[800],
        },
        submit: {
          50: colors.emerald[50],
          100: colors.emerald[100],
          200: colors.emerald[200],
          600: colors.emerald[600],
          700: colors.emerald[700],
          800: colors.emerald[800],
        },
      },
      danger: colors.red,
      success: colors.green,
      warning: colors.amber,
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans Devanagari"',
          '"Noto Sans Gujarati"',
          '"Noto Sans Bengali"',
          '"Noto Sans Tamil"',
          '"Noto Sans Telugu"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        base: ['1.125rem', { lineHeight: '1.65' }],
        lg: ['1.25rem', { lineHeight: '1.65' }],
        xl: ['1.375rem', { lineHeight: '1.6' }],
        '2xl': ['1.625rem', { lineHeight: '1.5' }],
        '3xl': ['2rem', { lineHeight: '1.4' }],
      },
      minHeight: {
        touch: '56px',
        'touch-lg': '72px',
      },
      minWidth: {
        touch: '56px',
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms',
        250: '250ms',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
