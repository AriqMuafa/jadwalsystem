/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './resources/views/**/*.blade.php',
    './resources/js/**/*.vue',
    './resources/js/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        sand: {
          50: '#faf8f4',
          100: '#f3ede0',
          200: '#e8dcc8',
          300: '#d9c5a3',
          400: '#c5a87a',
          500: '#b08f58',
          600: '#8f6f3e',
          700: '#6e5230',
          800: '#4e3a22',
          900: '#302215',
        },
        ink: {
          DEFAULT: '#1a1714',
          light: '#2e2a26',
          muted: '#6b6460',
        },
        sage: { DEFAULT: '#5a7a6a', light: '#e8f0ec' },
        rose: { DEFAULT: '#c45c5c', light: '#fbeaea' },
        sky: { DEFAULT: '#4a7fa8', light: '#e6f0f8' },
        amber: { DEFAULT: '#c47a2a', light: '#fdf3e3' },
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(26,23,20,0.08), 0 0 0 1px rgba(26,23,20,0.05)',
        'card-hover': '0 6px 24px 0 rgba(26,23,20,0.13), 0 0 0 1px rgba(26,23,20,0.08)',
        fab: '0 4px 20px 0 rgba(26,23,20,0.25)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
