/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        logo: ['"Grand Hotel"', 'cursive'],
      },
      colors: {
        ig: {
          blue: '#0095F6',
          blueHover: '#1877F2',
          red: '#FF3040',
          border: '#DBDBDB',
          darkBorder: '#262626',
          darkSurface: '#121212',
          darkElevated: '#262626',
        },
      },
    },
  },
  plugins: [],
};

