/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1B5E4E',
          mid: '#2E7D6A',
        },
        sage: {
          DEFAULT: '#5A8F76',
          light: '#A8CBBA',
          pale: '#EAF3EE',
        },
        burgundy: '#7B2D45',
        cream: '#F8F6F1',
        charcoal: '#2C3226',
        'mid-gray': '#5A6355',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
