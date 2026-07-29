/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        bg: { DEFAULT: '#FAF6F0', dark: '#1C1A18' },
        surface: { DEFAULT: '#FFFFFF', dark: '#272422' },
        'surface-alt': { DEFAULT: '#F0E6D8', dark: '#332D28' },
        primary: { DEFAULT: '#6B4423', hover: '#5A3A1D', dark: '#D9A468', 'dark-hover': '#E8B87F' },
        secondary: { DEFAULT: '#A97C50', dark: '#B08A5D' },
        border: { DEFAULT: '#E3D5C3', dark: '#453E37' },
        'text-primary': { DEFAULT: '#2B2118', dark: '#F2EBE1' },
        'text-secondary': { DEFAULT: '#6E6259', dark: '#B8AC9E' },
        success: { DEFAULT: '#4B6B3A', dark: '#8FAE72' },
        warning: { DEFAULT: '#B08325', dark: '#D6A94B' },
        danger: { DEFAULT: '#A13D2E', dark: '#D3705C' },
        emergency: { DEFAULT: '#C0392B', dark: '#E0574A' },
      },
    },
  },
  plugins: [],
}