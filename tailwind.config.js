/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        github: {
          bg: '#22272e',
          'bg-secondary': '#1c2128',
          border: '#444c56',
          text: '#adbac7',
          'text-secondary': '#768390',
          accent: '#539bf5',
          'accent-hover': '#4184e4',
          danger: '#e5534b',
          success: '#57ab5a',
          warning: '#c69026',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
