/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["system-ui", "Segoe UI", "sans-serif"],
      },
      colors: {
        poke: {
          yellow: "#ffcb05",
          blue: "#2a75bb",
          dark: "#1a1a2e",
          card: "#16213e",
        },
      },
    },
  },
  plugins: [],
};
