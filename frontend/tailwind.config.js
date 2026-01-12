/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#FF9500',
        success: '#34C759',
        danger: '#FF3B30',
        warning: '#FFCC00',
        info: '#5856D6',
        light: '#F7F7F7',
        dark: '#1C1C1E',
      },
    },
  },
  plugins: [],
}
