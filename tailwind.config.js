/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Nova SBE — azul petroleo / navy
        nova: {
          50: '#eef4fb',
          100: '#d7e6f5',
          200: '#a9c7e8',
          300: '#6fa0d6',
          400: '#3d78bf',
          500: '#1f5aa3',
          600: '#154680',
          700: '#0f3663',
          800: '#0a2540',
          900: '#061829',
        },
        accent: {
          400: '#f4a63a',
          500: '#e8912a',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 40px -22px rgba(0,0,0,0.8)',
        glow: '0 18px 50px -18px rgba(61,120,191,0.55)',
        fab: '0 12px 30px -6px rgba(61,120,191,0.6)',
      },
    },
  },
  plugins: [],
}
