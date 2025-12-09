/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          blue: '#00f3ff',
          pink: '#ff00ff',
          green: '#0aff00',
          yellow: '#ffff00',
          purple: '#bc13fe'
        }
      }
    },
  },
  plugins: [],
}
