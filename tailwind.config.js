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
    },
  },
  plugins: [],
}
