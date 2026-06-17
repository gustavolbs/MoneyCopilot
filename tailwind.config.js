/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        paper: '#F7F7F2',
        mint: '#41B883',
        coral: '#F9735B',
        gold: '#D9A441',
      },
    },
  },
  plugins: [],
};
