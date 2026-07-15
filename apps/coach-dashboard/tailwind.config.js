/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#39FF6A",
        background: "#131313",
        surface: "#1c1b1b",
        "surface-highlight": "rgba(255, 255, 255, 0.05)",
      },
      boxShadow: {
        glow: "0 0 15px rgba(57, 255, 106, 0.3)",
      }
    },
  },
  plugins: [],
}
