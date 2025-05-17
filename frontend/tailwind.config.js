/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'optra-dark': '#1a1d21',
        'optra-darker': '#141618',
        'optra-light': '#e0e0e0',
        'optra-accent': '#3a86ff',
        'optra-green': '#4cd964',
        'optra-red': '#ff3b30',
        'optra-yellow': '#ffcc00',
        'optra-blue': '#007aff'
      },
      fontFamily: {
        'mono': ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        'sans': ['SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif']
      },
      boxShadow: {
        'window': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'window-active': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }
    },
  },
  plugins: [],
}
