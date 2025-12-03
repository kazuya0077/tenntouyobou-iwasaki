/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0e7490', // cyan-700
        secondary: '#64748b', // slate-500
        accent: '#f59e0b', // amber-500
      }
    },
  },
  plugins: [],
}